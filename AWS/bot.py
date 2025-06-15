import os
import ccxt
import pandas as pd
import numpy as np
import time
import logging
import threading
from datetime import datetime, timezone
from typing import Optional
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from pymongo import MongoClient
from flask import Flask
from dotenv import load_dotenv
import requests

# ----- LOAD ENV VARIABLES -----
load_dotenv() 
PORT = int(os.getenv("PORT"))
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
# Retrieve backend host and port; provide defaults if they are not set
backend_uri = os.getenv("BACKEND_URI")
backend_port = os.getenv("BACKEND_PORT")

# Point to your sentiment endpoint (adjust if needed)
SENTIMENT_API_URL = "http://localhost:5001/get_sentiment_iterations"

# ----- LOGGER SETUP -----
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- CONFIGURATION CLASS ----------

class StrategyConfig:
    """
    Centralized configuration class for a quantitative trading strategy.
    Stores all parameters for technical indicators, AI modeling, risk management, 
    and data source configuration. Initialized with a trading symbol and timeframe.
    
    Attributes:
        SYMBOL (str): Trading pair symbol (e.g., 'BTC/USDT')
        TIMEFRAME (str): Chart timeframe (e.g., '1h', '4h', '1d')
        ... [other attributes documented below]
    """
    def __init__(self, SYMBOL, TIMEFRAME):
        self.EXCHANGE = 'binance'   # Supported cryptocurrency exchange
        self.SYMBOL = SYMBOL         # Trading pair (e.g., 'BTC/USDT')
        self.TIMEFRAME = TIMEFRAME   # Chart timeframe (e.g., '1h', '4h')
        
        # ----------------------
        # Technical Indicators
        # ----------------------
        self.RSI_PERIOD = 14          # Period for Relative Strength Index
        self.CCI_PERIOD = 20          # Period for Commodity Channel Index
        self.EMA_PERIOD = 50          # Period for Exponential Moving Average
        self.SMA_PERIOD = 50          # Period for Simple Moving Average
        self.ATR_PERIOD = 14          # Period for Average True Range (volatility)
        self.ADX_PERIOD = 14          # Period for Average Directional Index (trend strength)
        self.WT_CHANNEL_LENGTH = 10   # WaveTrend oscillator channel length
        self.WT_ATR_LENGTH = 21       # WaveTrend ATR smoothing period
        self.EMA_LONG = 200           # Long-term EMA period (trend identification)
        self.SMA_SHORT = 50           # Short-term SMA period (trend identification)
        self.LORENTZIAN_FEATURES = ['close', 'volume', 'RSI', 'CCI', 'EMA', 'SMA', 'ATR', 'ADX', 'WT', 'ROC']
        # Volatility measurement parameters
        self.VOLATILITY_WINDOW = 200       # Lookback window for volatility calc
        self.VOLATILITY_PERCENTILE = 0.80  # Percentile for volatility threshold
        # ----------------------
        # AI & Labeling Config
        # ----------------------
        self.Lookahead_window = 100   # Future bars to determine price movement labels
        self.window_size_AI = 200     # Input window size for AI model (historical bars)
        self.LIMIT = 1001             # Number of data points to fetch from exchange
        self.use_logistic_smoothing = True  # Apply smoothing to ML labels
        self.random_state = 42        # Random seed for reproducibility
        # ----------------------
        # Trading Parameters
        # ----------------------
        # Risk Management
        self.stop_atr_multiplier = 0.75    # ATR multiplier for stop-loss distance
        self.reward_atr_multiplier = 0.75  # ATR multiplier for take-profit distance
        # Auto-calculated risk/reward ratio
        self.reward_to_risk_ratio = self.reward_atr_multiplier / self.stop_atr_multiplier
        # Account Settings
        self.initial_balance = 1270.0      # Starting capital
        self.risk_per_trade = 0.7874       # % of capital risked per trade (0.7874% here)
        self.taker_fee_rate = 0.0005       # Exchange fee (0.05%)
        self.risk_multiplier = 2           # Position size multiplier
        # ----------------------
        # Data Storage Config
        # ----------------------
        # Loaded from environment variables (not shown in code):
        self.mongo_uri = MONGO_URI         # MongoDB connection string
        self.db_name = DB_NAME              # Database name
        # Collection name (sanitizes symbol: BTC/USDT -> BTC_USDT)
        self.collection_name = f"{SYMBOL.replace('/', '_')}"

# ---------- MARKET DATA FETCHER ----------
class MarketDataFetcher:
    @staticmethod
    def timeframe_to_minutes(tf: str) -> int:
        """
        Converts a timeframe string to total minutes.
        
        Args:
            tf: Timeframe string (e.g., '5m', '1h', '1d')
        
        Returns:
            Total minutes in the timeframe
            
        Raises:
            ValueError: For unrecognized timeframe formats
        """
        tf = tf.lower()  # Normalize to lowercase
        if tf.endswith("m"):
            # Extract minutes (remove 'm' suffix)
            return int(tf[:-1])
        elif tf.endswith("h"):
            # Convert hours to minutes
            return int(tf[:-1]) * 60
        elif tf.endswith("d"):
            # Convert days to minutes
            return int(tf[:-1]) * 60 * 24
        else:
            raise ValueError(f"Unrecognized timeframe: {tf}")

    @staticmethod
    def sleep_until_candle_close(tf_minutes: int):
        """
        Sleeps until the next candle close time minus a safety buffer.
        
        Calculates remaining time until the next complete candle period
        and sleeps for that duration minus a fixed reduction delay.
        
        Args:
            tf_minutes: Candle duration in minutes
        """
        reducedelay = 54  # Safety buffer in seconds (to account for delays)
        now_utc = datetime.now(timezone.utc)
        
        # Current minute and second in UTC
        minute = now_utc.minute
        second = now_utc.second

        # Calculate how many full intervals have passed
        times_passed = minute // tf_minutes
        # Next interval boundary (in minutes)
        next_multiple = (times_passed + 1) * tf_minutes

        # Minutes until next boundary
        delta_min = next_multiple - minute
        if delta_min < 0:  # Handle rollover
            delta_min += tf_minutes

        # Seconds remaining in current minute
        remain_sec = 60 - second
        # Total sleep time calculation
        total_sleep = delta_min * 60 + remain_sec - reducedelay
        total_sleep = max(0, total_sleep)  # Prevent negative sleep

        if total_sleep > 0:
            logger.info("---------------------------------------------------")
            logger.info(f"Sleeping {total_sleep} seconds until next {tf_minutes}m candle close...")
            time.sleep(total_sleep)

    @staticmethod
    def delete_database(db_name: str):
        """
        Deletes the specified MongoDB database.
        
        Args:
            db_name: Name of database to delete
        """
        client = MongoClient()  # Connect to default MongoDB instance
        client.drop_database(db_name)  # Execute deletion
        logger.info(f"❌ Deleted existing database: {db_name}")

    @staticmethod
    def fetch_binance_futures_ohlcv(symbol: str, timeframe: str, limit: int, last_known_ts: pd.Timestamp = None) -> Optional[pd.DataFrame]:
        """
        Fetches OHLCV data from Bybit Futures.
        
        Args:
            symbol: Trading pair (e.g., 'BTC/USDT')
            timeframe: Candle duration (e.g., '1h')
            limit: Number of candles to retrieve
            last_known_ts: Optional timestamp for incremental updates (not used here)
        
        Returns:
            DataFrame with OHLCV data or None if failed
        """
        # Initialize Bybit exchange connection
        exchange = ccxt.bybit({
            'options': {
                'defaultType': 'linear'  # For USDT perpetual contracts
            }
        })

        # Convert symbol to Bybit's format (remove '/')
        if "/" in symbol:
            base, quote = symbol.split("/")
            futures_symbol = f"{base}{quote}"
        else:
            futures_symbol = symbol
            
        # Retry configuration
        max_retries = 2
        retry_delay = 15  # seconds

        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching {limit} bars for {symbol} on {timeframe} (Attempt {attempt+1}/{max_retries})...")
                # Fetch raw OHLCV data from exchange
                ohlcv = exchange.fetch_ohlcv(futures_symbol, timeframe, since=None, limit=limit)

                # Validate data existence
                if not ohlcv or len(ohlcv) < 2:
                    logger.warning("No or insufficient data from Bybit.")
                    return None

                # Convert to DataFrame
                df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                # Convert UNIX ms timestamps to datetime
                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                # Ensure unique timestamps
                df.drop_duplicates(subset=['timestamp'], inplace=True)
                # Sort chronologically
                df.sort_values('timestamp', inplace=True)
                df.reset_index(drop=True, inplace=True)

                # Remove last candle (likely incomplete)
                if len(df) > 0:
                    last_candle_time = df.iloc[-1]['timestamp']
                    logger.info(f"Dropping the last row to skip the unfinished candle. Time: {last_candle_time}")
                    df = df.iloc[:-1]

                logger.info(f"✅ Successfully fetched {len(df)} fully closed bars.")
                return df

            except Exception as e:
                logger.error(f"Error fetching data: {e}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error("❌ Maximum retries reached. Skipping this iteration.")
                    return None

# ---------- TECHNICAL INDICATORS ----------
# ---------- TECHNICAL INDICATORS ----------
class TechnicalIndicators:
    @staticmethod
    def calculate_indicators(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Calculates and adds technical indicators to the DataFrame.
        
        Args:
            df: DataFrame containing OHLCV data
            config: Strategy configuration with indicator parameters
            
        Returns:
            DataFrame with added technical indicator columns
        """
        logger.info("Calculating technical indicators...")

        # Relative Strength Index (RSI) - momentum oscillator
        if 'RSI' not in df.columns:  # Only calculate if not already present
            delta = df["close"].diff()  # Price changes between periods
            # Calculate average gains and losses
            gain = (delta.where(delta > 0, 0)).rolling(window=config.RSI_PERIOD).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=config.RSI_PERIOD).mean()
            rs = gain / loss  # Relative strength
            df["RSI"] = 100 - (100 / (1 + rs))  # RSI formula

        # Commodity Channel Index (CCI) - cyclical indicator
        if 'CCI' not in df.columns:
            # Typical price calculation
            tp = (df["high"] + df["low"] + df["close"]) / 3
            # Moving average of typical price
            cci_mean = tp.rolling(window=config.CCI_PERIOD).mean()
            # Mean deviation calculation
            mean_dev = (tp - cci_mean).abs().rolling(window=config.CCI_PERIOD).mean()
            # Final CCI calculation
            df["CCI"] = (tp - cci_mean) / (0.015 * mean_dev)

        # Exponential Moving Average (EMA) - weighted moving average
        if 'EMA' not in df.columns:
            # EMA gives more weight to recent prices
            df["EMA"] = df["close"].ewm(span=config.EMA_PERIOD, adjust=False).mean()
        
        # Simple Moving Average (SMA) - unweighted moving average
        if 'SMA' not in df.columns:
            df["SMA"] = df["close"].rolling(window=config.SMA_PERIOD).mean()

        # Average True Range (ATR) - volatility measure
        if 'ATR' not in df.columns:
            # Simplified ATR using only high-low range
            df["ATR"] = (df["high"] - df["low"]).rolling(window=config.ATR_PERIOD).mean()

        # Average Directional Index (ADX) - trend strength indicator
        if 'ADX' not in df.columns:
            adx_len = config.ADX_PERIOD
            di_len = config.ADX_PERIOD
            
            # True Range calculation
            df["TR"] = np.maximum(
                df["high"] - df["low"],  # Current period range
                np.maximum(
                    abs(df["high"] - df["close"].shift(1)),  # Gap up
                    abs(df["low"] - df["close"].shift(1))    # Gap down
                )
            )
            
            # Directional movement calculations
            up_move = df["high"].diff()
            down_move = -df["low"].diff()
            df["+DM"] = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
            df["-DM"] = np.where((down_move > up_move) & (down_move > 0), down_move, 0)

            # Directional Indicators (+DI and -DI)
            df["+DI"] = 100 * (df["+DM"].rolling(window=di_len).mean() / df["TR"].rolling(window=di_len).mean())
            df["-DI"] = 100 * (df["-DM"].rolling(window=di_len).mean() / df["TR"].rolling(window=di_len).mean())

            # Directional Movement Index (DX)
            df["DX"] = 100 * (abs(df["+DI"] - df["-DI"]) / (df["+DI"] + df["-DI"]))
            # Average DX becomes ADX
            df["ADX"] = df["DX"].rolling(window=adx_len).mean()

            # Cleanup intermediate columns
            df.drop(columns=["TR", "+DM", "-DM", "+DI", "-DI", "DX"], inplace=True)

        # WaveTrend Oscillator (WT) - momentum/volatility indicator
        if 'WT' not in df.columns:
            # Calculate typical price (HLC/3)
            hlc3 = (df["high"] + df["low"] + df["close"]) / 3
            # EMA of typical price (ESA)
            esa = hlc3.ewm(span=config.WT_CHANNEL_LENGTH, adjust=False).mean()
            # EMA of absolute deviations (D)
            d = abs(hlc3 - esa).ewm(span=config.WT_ATR_LENGTH, adjust=False).mean()
            # Final WaveTrend calculation
            df["WT"] = (hlc3 - esa) / (0.015 * d)

        # Remove rows with missing values (from indicator calculations)
        df.dropna(inplace=True)
        logger.info("Indicators calculated.")
        return df

# ---------- DERIVED FEATURES ----------
# ---------- DERIVED FEATURES ----------
class DerivedFeatures:
    @staticmethod
    def calculate_features(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Calculates derived features for market analysis and trading signals.
        
        Creates features that combine multiple indicators to capture:
        - Market regime (trend direction)
        - Volatility conditions
        - Technical relationships
        
        Args:
            df: DataFrame with OHLCV and technical indicators
            config: Strategy configuration parameters
            
        Returns:
            DataFrame with added derived features
        """
        logger.info("Calculating derived features...")

        # Ensure needed columns exist (create if missing)
        # Long-term Exponential Moving Average
        if "EMA_LONG" not in df.columns:
            df["EMA_LONG"] = df["close"].ewm(span=config.EMA_LONG, adjust=False).mean()
        
        # Short-term Simple Moving Average
        if "SMA_SHORT" not in df.columns:
            df["SMA_SHORT"] = df["close"].rolling(window=config.SMA_SHORT).mean()

        # Market Regime Detection -------
        # Ratio between short and long moving averages
        df["Market_Regime"] = df["SMA_SHORT"] / df["EMA_LONG"]
        
        # Rate of change of the regime ratio
        df["Regime_Gradient"] = df["Market_Regime"].diff()
        
        # Standard deviation of gradient for dynamic thresholding
        std_dev = df["Regime_Gradient"].rolling(window=config.SMA_SHORT).std()

        # Classify market conditions based on gradient deviations
        df["Regime_Label"] = np.where(
            df["Regime_Gradient"] > std_dev, "Uptrend",  # Strong positive momentum
            np.where(df["Regime_Gradient"] < -std_dev, "Downtrend", "Ranging")  # Strong negative or neutral
        )

        # Volatility Filter -------
        # Normalized volatility measure (ATR as percentage of price)
        df["Volatility_Filter"] = df["ATR"] / df["close"]
        
        # Calculate rolling 80th percentile volatility threshold
        percentile_80 = df["Volatility_Filter"].rolling(
            window=config.VOLATILITY_WINDOW
        ).quantile(config.VOLATILITY_PERCENTILE)
        
        # Flag high volatility periods
        df["High_Volatility"] = df["Volatility_Filter"] > percentile_80

        # Cleanup intermediate columns and missing values
        df.dropna(inplace=True)
        df.drop(
            columns=["Market_Regime", "Regime_Gradient", "Volatility_Filter"], 
            inplace=True, 
            errors='ignore'  # Silently ignore if columns don't exist
        )
        
        logger.info("Derived features calculated.")
        return df

# ---------- LABELING FEATURES ----------
# ---------- LABELING FEATURES ----------
class LabelingFeature:
    """
    Creates labeling features for supervised learning by:
    - Calculating adaptive lookahead periods
    - Identifying market structure levels
    - Computing momentum characteristics
    - Measuring feature space distances
    """
    
    @staticmethod
    def compute_lookahead_period(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Computes adaptive lookahead period based on volatility (ATR).
        
        Higher volatility periods require longer lookahead to capture meaningful moves.
        Converts ATR to percentile rank and scales to 7-14 periods.
        
        Args:
            df: DataFrame with ATR column
            config: Strategy configuration
            
        Returns:
            DataFrame with added 'Lookahead_Period' column
        """
        logger.info("Computing lookahead period (ATR-based)...")
        window = config.Lookahead_window

        # Convert ATR to percentile rank within rolling window
        df['ATR_Percentile'] = df['ATR'].rolling(window=window).rank(pct=True)
        df.dropna(subset=['ATR_Percentile'], inplace=True)  # Remove incomplete calculations
        
        # Scale percentile to 7-14 period range (minimum 7, maximum 14)
        df['Lookahead_Period'] = np.clip(
            ((df['ATR_Percentile'] * 7) + 7).round(),  # Scale: [0,1] -> [7,14]
            7, 14  # Constrain between min and max
        ).astype(int)  # Ensure integer periods
        
        df.drop(columns=['ATR_Percentile'], inplace=True)  # Cleanup intermediate
        return df

    @staticmethod
    def compute_market_structure(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Identifies key market structure levels (support/resistance) and breakouts.
        
        Calculates:
        - Rolling high/low as near-term extremes
        - Support/resistance as smoothed levels
        - Breakout confirmation when price crosses these levels
        
        Args:
            df: DataFrame with price columns
            config: Strategy configuration
            
        Returns:
            DataFrame with added market structure columns
        """
        logger.info("Computing market structure (Support/Resistance)...")
        window = config.Lookahead_window

        # Identify recent price extremes
        df['Rolling_High'] = df['high'].rolling(window=window).max()
        df['Rolling_Low'] = df['low'].rolling(window=window).min()

        # Create smoothed support/resistance levels
        df['Support_Level'] = df['Rolling_Low'].rolling(window=window).mean()
        df['Resistance_Level'] = df['Rolling_High'].rolling(window=window).mean()

        # Breakout confirmation flags:
        #  1 = Breakout above resistance
        # -1 = Breakdown below support
        #  0 = No breakout
        df['Breakout_Confirm'] = np.where(
            df['close'] > df['Resistance_Level'], 1,
            np.where(df['close'] < df['Support_Level'], -1, 0)
        )

        # Cleanup intermediate columns
        df.drop(columns=['Rolling_High', 'Rolling_Low'], inplace=True)
        df.dropna(inplace=True)  # Remove rows with incomplete calculations
        return df

    @staticmethod
    def compute_momentum_features(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Computes momentum characteristics and confirmation signals.
        
        Creates:
        - Rate of Change (ROC) over configurable window
        - Momentum percentile within recent distribution
        - Confirmation signals based on percentile thresholds
        
        Args:
            df: DataFrame with price data
            config: Strategy configuration
            
        Returns:
            DataFrame with added momentum features
        """
        logger.info("Computing momentum-based features...")
        window = config.Lookahead_window

        # Rate of Change - percentage price movement over window
        df['ROC'] = df['close'].pct_change(periods=window) * 100
        
        # Convert ROC to percentile rank within recent window
        df['Momentum_Percentile'] = df['ROC'].rolling(window=window).rank(pct=True)

        # Momentum confirmation signals:
        #  1 = Strong momentum (top 20%)
        # -1 = Weak momentum (bottom 20%)
        #  0 = Neutral momentum (middle 20% or between thresholds)
        df['Momentum_Confirm'] = np.where(
            df['Momentum_Percentile'] >= 0.80, 1,  # Top quintile
            np.where(df['Momentum_Percentile'] <= 0.20, -1,  # Bottom quintile
                     np.where((df['Momentum_Percentile'] >= 0.40) & 
                              (df['Momentum_Percentile'] <= 0.60), 0, 0))  # Middle quintile
        )

        # Cleanup and remove incomplete data
        df.drop(columns=['Momentum_Percentile'], inplace=True, errors='ignore')
        df.dropna(subset=['ROC'], inplace=True)
        return df

    @staticmethod
    def compute_lorentzian_distance(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Computes Lorentzian distance between feature vectors.
        
        Measures change in multidimensional feature space using log transformation.
        Formula: log(1 + Σ|feature_diff|)
        
        Args:
            df: DataFrame with feature columns
            config: Strategy configuration (contains feature list)
            
        Returns:
            DataFrame with added 'Lorentzian_Distance' column
        """
        logger.info("Computing Lorentzian distance...")
        if 'Lorentzian_Distance' not in df.columns:  # Only calculate if missing
            feat_cols = config.LORENTZIAN_FEATURES  # Features from configuration
            
            # Calculate sum of absolute changes across features
            feature_diffs = np.abs(df[feat_cols].diff())
            
            # Apply Lorentzian transformation: log(1 + sum(|Δfeatures|))
            df['Lorentzian_Distance'] = np.log(1 + feature_diffs.sum(axis=1))
            
        df.dropna(inplace=True)  # Remove rows with missing values
        return df

# ---------- CANDLE LABELING ----------
class CandelLabeling:
    """
    Applies multi-condition labeling logic to identify trading signals.
    Uses technical indicators, market structure, momentum, and feature-space analysis
    to classify candles as bullish (1), bearish (-1), or neutral (0).
    """

    @staticmethod
    def label_candles(df: pd.DataFrame, config: StrategyConfig) -> pd.DataFrame:
        """
        Applies complex labeling rules to candles using 5 primary conditions
        followed by a confidence-based neutralization pass.
        
        Condition priority:
        1. Primary trend signals
        2. Neutral zone identification
        3. Breakout confirmation
        4. Counter-trend reversal signals
        5. Lorentzian outlier detection
        Final: Confidence-based neutralization
        
        Args:
            df: DataFrame with all calculated features
            config: Strategy configuration (unused in current implementation)
            
        Returns:
            DataFrame with 'Candle_Label' column added
        """
        logger.info("Applying candle labeling...")
        # Initialize all labels to neutral (0)
        df['Candle_Label'] = 0

        # ===== CONDITION 1: PRIMARY TREND SIGNALS =====
        # Identifies strong trend-following opportunities
        # Bullish: Price above support, short MA > long MA, strong trend
        df.loc[
            (df['close'] > df['Support_Level']) &  # Trading above support
            (df['EMA_LONG'] < df['SMA_SHORT']) &  # Bullish MA crossover (short above long)
            (df['ADX'] > 25),                    # Strong trend confirmation (ADX > 25)
            'Candle_Label'
        ] = 1  # Bullish signal

        # Bearish: Price below resistance, short MA < long MA, strong trend
        df.loc[
            (df['close'] < df['Resistance_Level']) &  # Trading below resistance
            (df['EMA_LONG'] > df['SMA_SHORT']) &      # Bearish MA crossover (short below long)
            (df['ADX'] > 25),                         # Strong trend confirmation
            'Candle_Label'
        ] = -1  # Bearish signal

        # ===== CONDITION 2: NEUTRAL ZONE IDENTIFICATION =====
        # Flags candles in consolidation zones with neutral momentum
        neutral_mask = (
            df['close'].between(df['Support_Level'], df['Resistance_Level']) &  # Price between S/R
            (df['Momentum_Confirm'] == 0)  # Neutral momentum reading
        )
        df.loc[neutral_mask, 'Candle_Label'] = 0  # Force neutral classification

        # ===== CONDITION 3: BREAKOUT CONFIRMATION =====
        # Confirms valid breakouts with supporting momentum
        # Bullish breakout: Price breaks resistance with positive momentum
        df.loc[
            (df['Breakout_Confirm'] == 1) &  # Closed above resistance
            (df['ROC'] > 0) &                # Positive rate of change
            (df['Momentum_Confirm'] == 1),   # Strong bullish momentum confirmation
            'Candle_Label'
        ] = 1

        # Bearish breakout: Price breaks support with negative momentum
        df.loc[
            (df['Breakout_Confirm'] == -1) &  # Closed below support
            (df['ROC'] < 0) &                 # Negative rate of change
            (df['Momentum_Confirm'] == -1),   # Strong bearish momentum confirmation
            'Candle_Label'
        ] = -1

        # ===== CONDITION 4: COUNTER-TREND REVERSAL SIGNALS =====
        # Identifies potential reversal points at key levels
        # Bullish reversal: Oversold below support but with bullish momentum
        df.loc[
            (df['close'] < df['Support_Level']) &  # Trading below support (oversold)
            (df['Momentum_Confirm'] == 1),         # Bullish momentum divergence
            'Candle_Label'
        ] = 1

        # Bearish reversal: Overbought above resistance but with bearish momentum
        df.loc[
            (df['close'] > df['Resistance_Level']) &  # Trading above resistance (overbought)
            (df['Momentum_Confirm'] == -1),           # Bearish momentum divergence
            'Candle_Label'
        ] = -1

        # ===== CONDITION 5: LORENTZIAN OUTLIERS =====
        # Detects significant feature-space movements during breakouts
        # Identify top 20% of Lorentzian Distance values (significant changes)
        extreme_dist = df['Lorentzian_Distance'] > df['Lorentzian_Distance'].quantile(0.80)
        
        # Bullish outlier: Extreme feature change during upside breakout
        df.loc[extreme_dist & (df['Breakout_Confirm'] == 1), 'Candle_Label'] = 1
        
        # Bearish outlier: Extreme feature change during downside breakout
        df.loc[extreme_dist & (df['Breakout_Confirm'] == -1), 'Candle_Label'] = -1

        # ===== CONFIDENCE-BASED NEUTRALIZATION =====
        # Overrides previous labels when confidence is low
        low_conf = (
            (df['Momentum_Confirm'].abs() < 0.5) |  # Weak momentum signal
            (df['ADX'] < 20)                        # Weak trend strength
        )
        df.loc[low_conf, 'Candle_Label'] = 0  # Revert to neutral

        return df

# ---------- AI MODEL ----------
class AIModel:
    """
    Hybrid machine learning model for candle direction prediction.
    Combines K-Nearest Neighbors (KNN) with optional Logistic Regression smoothing.
    Features:
    - Dynamic KNN based on adaptive lookahead period
    - Feature scaling using StandardScaler
    - Optional probability smoothing with logistic regression
    - MongoDB integration for data persistence
    """

    def __init__(self, config: StrategyConfig):
        """
        Initializes the AI model with configuration and database connection.
        
        Args:
            config: Strategy configuration containing:
                - mongo_uri: MongoDB connection string
                - db_name: Database name
                - collection_name: Collection name
                - random_state: Seed for reproducible results
                - use_logistic_smoothing: Flag for probability smoothing
        """
        self.config = config
        # MongoDB connection setup
        self.client = MongoClient(self.config.mongo_uri)
        self.db = self.client[self.config.db_name]
        self.collection = self.db[self.config.collection_name]

        self.use_logistic_smoothing = self.config.use_logistic_smoothing

        # Initialize models and scaler
        self.knn = KNeighborsClassifier()  # Base KNN classifier
        self.lr = LogisticRegression(  # Optional smoothing model
            random_state=self.config.random_state,
            max_iter=1000  # Ensure convergence
        )
        self.scaler = StandardScaler()  # Feature normalization

    def train_and_predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Trains models on recent data and predicts the next candle's direction.
        
        Process:
        1. Validate data requirements
        2. Split into training (window_size) and test (most recent candle)
        3. Scale features using StandardScaler
        4. Set KNN neighbors dynamically based on lookahead period
        5. Train KNN and optionally train LR on KNN probabilities
        6. Predict next candle direction
        
        Args:
            df: DataFrame with features and labels
            
        Returns:
            DataFrame with 'prediction' column added
        """
        logger.info("Training on the last window_size_AI candles & predicting the next candle...")

        # Feature set configuration
        features = ['close', 'volume', 'RSI', 'CCI', 'EMA', 'SMA', 'ATR', 'ADX', 'WT', 'ROC', 'Lorentzian_Distance']
        needed_cols = features + ['Candle_Label', 'Lookahead_Period']
        
        # Clean data - remove rows with missing features or labels
        df.dropna(subset=needed_cols, inplace=True)

        # Validate data sufficiency
        window_size = self.config.window_size_AI
        if len(df) < (window_size + 1):
            logger.warning(f"Not enough data to train with window_size={window_size}. Need at least {window_size+1} rows.")
            df['prediction'] = np.nan
            return df
        
        # Data segmentation -----
        # Training set: Last 'window_size' candles (excluding the very last candle)
        train_data = df.iloc[-(window_size+1):-1].copy()  
        # Test set: Most recent candle (to predict)
        test_data  = df.iloc[-1:].copy()   

        # Prepare feature matrices
        X_train = train_data[features].values
        y_train = train_data['Candle_Label'].values
        X_test  = test_data[features].values
        
        # Feature scaling -----
        # Fit scaler to training data, transform both sets
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled  = self.scaler.transform(X_test)

        # Dynamic KNN configuration -----
        # Set neighbors based on average lookahead period (volatility-adaptive)
        k_neighbors = int(train_data['Lookahead_Period'].mean())
        # Ensure at least 1 neighbor
        k_neighbors = max(1, k_neighbors)  
        self.knn.set_params(n_neighbors=k_neighbors)
        
        # Train KNN base model
        self.knn.fit(X_train_scaled, y_train)

        # Optional Logistic Smoothing -----
        if self.use_logistic_smoothing:
            # Get KNN class probabilities for training data
            knn_proba_train = self.knn.predict_proba(X_train_scaled)
            # Combine original features with KNN probabilities
            X_train_smooth  = np.concatenate([X_train_scaled, knn_proba_train], axis=1)
            
            # Train logistic regression on enhanced features
            self.lr.fit(X_train_smooth, y_train)

            # Prepare test data with KNN probabilities
            knn_proba_test = self.knn.predict_proba(X_test_scaled)
            X_test_smooth  = np.concatenate([X_test_scaled, knn_proba_test], axis=1)
            
            # Make final prediction
            final_pred = self.lr.predict(X_test_smooth)[0]
        else:
            # Direct KNN prediction
            final_pred = self.knn.predict(X_test_scaled)[0]

        # Store prediction -----
        # Initialize prediction column with NaN
        df['prediction'] = np.nan  
        # Set prediction only for the last candle
        df.loc[df.index[-1], 'prediction'] = final_pred
        
        return df

# ---------- Api Calls  ----------
def user_trade_open(trade_data: dict):
    """
    Communicates trade opening details to the backend system.
    
    Sends structured trade data to the backend API endpoint for trade execution.
    Handles response success/failure with appropriate logging.
    
    Args:
        trade_data: Dictionary containing:
            symbol: Trading pair (e.g., 'BTC/USDT')
            direction: Trade direction ('long' or 'short')
            stop_loss: Stop loss price
            take_profit: Take profit price
            investment_per_trade: Dollar amount to invest
            amount_multiplier: Position size multiplier
    """
    # Construct API endpoint URL
    open_trade_endpoint = f"http://{backend_uri}:{backend_port}/opentrades/open_trade"

    # Prepare structured payload for backend
    payload = {
        "symbol": str(trade_data["symbol"]),  # Ensure string format
        "direction": str(trade_data["direction"]),  # 'long' or 'short'
        "stop_loss": float(trade_data["stop_loss"]),  # Convert to float for precision
        "take_profit": float(trade_data["take_profit"]),  # Convert to float
        "investment_per_trade": float(trade_data["investment_per_trade"]),  # Dollar amount
        "amount_multiplier": float(trade_data["amount_multiplier"]),  # Position size multiplier
    }

    # Send POST request to backend
    response = requests.post(open_trade_endpoint, json=payload)
    
    # Handle response
    if response.status_code == 200:
        data = response.json()
        # Visual separation for important messages
        print("####################")
        print(data["message"])  # Success message from backend
        print("####################")
    else:
        # Error handling with detailed information
        print(f"Error: {response.status_code}, {response.text}")

def user_trade_close(symbol: str, direction: str, reason: str):
    """
    Communicates trade closure to the backend system.
    
    Notifies backend when a trade should be closed, including the reason.
    Provides visual feedback for closure confirmation.
    
    Args:
        symbol: Trading pair to close (e.g., 'BTC/USDT')
        direction: Original trade direction ('long' or 'short')
        reason: Closure reason (e.g., 'stop_loss', 'take_profit', 'manual_close')
    """
    # Construct API endpoint URL
    close_trade_endpoint = f"http://{backend_uri}:{backend_port}/closetrades/close_trade"
    
    # Prepare structured payload
    payload = {
        "symbol": symbol,
        "direction": direction,
        "reason": reason  # Explanation for closure
    }
    
    # Send POST request to backend
    response = requests.post(close_trade_endpoint, json=payload)
    data = response.json()  # Parse JSON response

    # Display closure confirmation
    print("###############################")
    print(data["message"])  # Closure message from backend
    print("###############################")

# ---------- TRADING SIMULATION ----------
class TradingSimulation:
    """
    Simulates trading operations including:
    - Trade opening/closing
    - Position management
    - Risk management (martingale-style)
    - Profit/loss calculation
    - Integration with MongoDB for trade tracking
    """

    def __init__(self, config: StrategyConfig):
        """Initialize trading simulation with configuration"""
        self.config = config
        # MongoDB connection setup
        self.client = MongoClient(self.config.mongo_uri)
        self.db = self.client[self.config.db_name]
        self.trades_collection = self.db[self.config.collection_name]

        # Trading parameters
        self.symbol = self.config.SYMBOL
        self.initial_balance = self.config.initial_balance
        self.current_risk_percent = self.config.risk_per_trade  # Current risk percentage

        # Resume risk management from last trade
        self._resume_risk_from_last_trade()

    def filter_signal(self, row) -> bool:
        """Placeholder for custom signal filtering logic (always True by default)"""
        return True

    def _resume_risk_from_last_trade(self):
        """
        Resumes risk management from the last closed trade.
        Implements martingale-style risk adjustment:
        - Double investment after stop loss (SL)
        - Reset to base risk after take profit (TP)
        """
        # Find last closed trade (either TP or SL)
        last_closed_trade = self.trades_collection.find_one(
            {"status": {"$in": ["TP", "SL"]}},
            sort=[("exit_time", -1)]  # Most recent first
        )

        if last_closed_trade:
            last_trade_status = last_closed_trade["status"]
            last_investment = last_closed_trade.get(
                "investment_per_trade", 
                self.config.risk_per_trade
            )
            # Risk management rules
            if last_trade_status == "SL":
                self.current_investment_per_trade = last_investment * 2  # Martingale: double after loss
            elif last_trade_status == "TP":
                self.current_investment_per_trade = self.config.risk_per_trade  # Reset after win
        else:
            # No previous trades - use default risk
            self.current_investment_per_trade = self.config.risk_per_trade

    def update_investment_per_trade(self, last_trade_status: str):
        """
        Updates current risk percentage based on trade outcome.
        
        Args:
            last_trade_status: "SL" or "TP"
        """
        if last_trade_status in ["SL"]:
            # Increase risk after loss
            self.current_risk_percent *= self.config.risk_multiplier  
        elif last_trade_status in ["TP"]:
            # Reset to base risk after win
            self.current_risk_percent = self.config.risk_per_trade

    def calculate_risk_amount(self, entry_price, exit_price):
        """
        Calculates risk amount and position size multiplier.
        
        Args:
            entry_price: Trade entry price
            exit_price: Stop loss or take profit price
            
        Returns:
            risk_amount: Dollar amount at risk
            amount_multiplier: Position size multiplier
        """
        if entry_price == 0:  # Safety check
            return 0, 0
        
        # Calculate price difference percentage
        price_diff_percent = abs((exit_price - entry_price) / entry_price) * 100
        if price_diff_percent == 0:  # Avoid division by zero
            return 0, 0
        
        # Calculate position size multiplier (inverse of price move percentage)
        amount_multiplier = 100 / price_diff_percent
        
        # Calculate dollar risk amount
        risk_amount = (self.current_risk_percent / 100.0) * self.initial_balance * amount_multiplier
        return risk_amount, amount_multiplier

    def calculate_quantity(self, entry_price, exit_price):
        """
        Calculates trade quantity based on risk parameters.
        
        Args:
            entry_price: Trade entry price
            exit_price: Stop loss price (for risk calculation)
            
        Returns:
            quantity: Asset quantity to trade
            amount_multiplier: Position size multiplier
        """
        risk_amount, amount_multiplier = self.calculate_risk_amount(entry_price, exit_price)
        if entry_price == 0:  # Safety check
            return 0, amount_multiplier
        
        # Calculate asset quantity (risk_amount / entry_price)
        quantity = risk_amount / entry_price
        return quantity, amount_multiplier

    def calculate_pnl(self, entry_price, exit_price, direction: str):
        """
        Calculates profit and loss for a trade.
        
        Args:
            entry_price: Trade entry price
            exit_price: Trade exit price
            direction: "LONG" or "SHORT"
            
        Returns:
            profit: Gross profit (before fees)
            net_pnl: Net profit (after fees)
            total_fee: Total trading fees
            amount_multiplier: Final position multiplier
        """
        # Get position size
        quantity, amount_multiplier = self.calculate_quantity(entry_price, exit_price)
        
        # Calculate gross profit based on direction
        if direction.upper() == "LONG":
            profit = (exit_price - entry_price) * quantity
        else:  # SHORT
            profit = (entry_price - exit_price) * quantity
        
        # Calculate trading fees (taker fees both sides)
        fee_entry = quantity * entry_price * self.config.taker_fee_rate
        fee_exit  = quantity * exit_price  * self.config.taker_fee_rate
        total_fee = fee_entry + fee_exit
        
        # Calculate net profit (gross profit - fees)
        net_pnl = profit - total_fee
        return profit, net_pnl, total_fee, amount_multiplier

    def get_open_trade(self):
        """Retrieves currently open trade from database"""
        return self.trades_collection.find_one({"status": "OPEN"})

    def open_trade(self, row):
        """
        Opens a new trade based on prediction signal.
        
        Args:
            row: Current market data row with prediction
        """
        # Determine trade direction from prediction (1 = LONG, -1 = SHORT)
        direction_str = "LONG" if row["prediction"] == 1 else "SHORT"
        entry_price = row["close"]
        atr = row["ATR"]  # Average True Range for volatility measurement

        # Set stop loss and take profit based on ATR multiples
        if direction_str == "LONG":
            stop_loss = entry_price - (self.config.stop_atr_multiplier * atr)
            take_profit = entry_price + (self.config.reward_atr_multiplier * atr)
            approximate_exit_for_risk = stop_loss  # Use SL for risk calculation
        else:  # SHORT
            stop_loss = entry_price + (self.config.stop_atr_multiplier * atr)
            take_profit = entry_price - (self.config.reward_atr_multiplier * atr)
            approximate_exit_for_risk = stop_loss

        # Calculate risk parameters
        risk_amount, amount_multiplier = self.calculate_risk_amount(entry_price, approximate_exit_for_risk)

        # Prepare trade document for database
        trade_data = {
            "symbol": self.symbol,
            "direction": direction_str,
            "entry_time": row["timestamp"],
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "status": "OPEN",
            "exit_time": None,
            "exit_price": None,
            "investment_per_trade": self.current_risk_percent,
            "amount_multiplier": amount_multiplier,
            "total_fees": 0,
            "pnl": 0,
            "net_pnl": 0
        }

        # Insert trade into database
        self.trades_collection.insert_one(trade_data)
        logger.info(
            f"Opened {direction_str} trade @ {entry_price:.2f} | "
            f"SL={stop_loss:.2f}, TP={take_profit:.2f}, risk%={self.current_risk_percent}"
        )

        # Notify backend about trade opening
        user_trade_open(trade_data)

    def close_trade(self, open_trade, reason: str, row, forced_exit_price=None):
        """
        Closes an open trade.
        
        Args:
            open_trade: Trade document from database
            reason: Closure reason ("TP", "SL", etc.)
            row: Current market data
            forced_exit_price: Optional forced exit price (for SL/TP hits)
        """
        # Determine exit price (forced or current close)
        exit_price = forced_exit_price if forced_exit_price is not None else row["close"]
        
        # Extract trade parameters
        symbol = open_trade["symbol"]
        direction = open_trade["direction"]
        entry_price = open_trade["entry_price"]
        
        # Calculate P&L
        profit, net_pnl, total_fee, final_amount_multiplier = self.calculate_pnl(
            entry_price, exit_price, direction
        )

        # Prepare update data
        update_data = {
            "exit_time": row["timestamp"],
            "exit_price": exit_price,
            "status": reason,
            "pnl": profit,
            "net_pnl": net_pnl,
            "total_fees": total_fee,
            "amount_multiplier": final_amount_multiplier
        }
        
        # Update trade in database
        self.trades_collection.update_one({"_id": open_trade["_id"]}, {"$set": update_data})

        logger.info(
            f"Closed trade OF {symbol} -> {direction} with status={reason} @ {exit_price:.2f}. "
            f"PNL={profit:.2f}, NetPNL={net_pnl:.2f}, Fees={total_fee:.2f}"
        )

        # Notify backend about trade closure
        user_trade_close(symbol, direction, reason)
        
        # Update risk management based on trade outcome
        self.update_investment_per_trade(reason)
        
        # Trigger trade analysis
        trade_analysis = TradeAnalysys(self.db, self.config)
        trade_analysis.analyze_and_store()

    def check_sl_tp(self, open_trade, row):
        """
        Checks if current price hits stop loss or take profit.
        
        Args:
            open_trade: Currently open trade
            row: Current market data
            
        Returns:
            True if trade was closed, False otherwise
        """
        direction = open_trade["direction"]
        sl = open_trade["stop_loss"]
        tp = open_trade["take_profit"]
        current_low = row["low"]
        current_high = row["high"]
        time = row["timestamp"]

        # Debug print statements
        print("---------------------------")
        print("time: ", time)
        print("direction: ", direction)

        if direction == "LONG":
            print("----------")
            print(f"Low: {current_low} <= SL {sl}")
            print("---")
            print(f"High: {current_high} >= TP {tp}")
            print("----------")
            
            # Check for SL hit (long position)
            if current_low <= sl:
                logger.info("----------")
                logger.info(f"SL HIT at {current_low}")
                self.close_trade(open_trade, reason="SL", row=row, forced_exit_price=sl)
                return True
            # Check for TP hit (long position)
            elif current_high >= tp:
                logger.info("----------")
                logger.info(f"TP HIT at {current_high}")
                self.close_trade(open_trade, reason="TP", row=row, forced_exit_price=tp)
                return True
            logger.info("TP or SL not HIT.")
            return False
        else:  # SHORT
            print("----------")
            print(f"High: {current_high} >= SL {sl}")
            print("---")
            print(f"Low: {current_low} <= TP {tp}")
            print("----------")
            
            # Check for SL hit (short position)
            if current_high >= sl:
                logger.info("----------")
                logger.info(f"SL HIT at {current_high}")
                self.close_trade(open_trade, reason="SL", row=row, forced_exit_price=sl)
                return True
            # Check for TP hit (short position)
            elif current_low <= tp:
                logger.info("----------")
                logger.info(f"TP HIT at {current_low}")
                self.close_trade(open_trade, reason="TP", row=row, forced_exit_price=tp)
                return True
            logger.info("TP or SL not HIT.")
            return False

    def handle_signal(self, row):
        """
        Main trading decision handler.
        Processes signals and manages trade lifecycle.
        
        Args:
            row: Current market data with prediction
        """
        # Check for existing open trade
        open_trade = self.get_open_trade()
        trade_closed = False

        # Check if existing trade hit SL/TP
        if open_trade:
            logger.info("Checking if open trade hit TP or SL.")
            trade_closed = self.check_sl_tp(open_trade, row)

        # Apply custom signal filter
        if not self.filter_signal(row):
            logger.info("Signal is skipped.")
            return

        # Decision logic for new trade
        if not open_trade or trade_closed:
            # No open trade or trade just closed - open new trade
            logger.info("No open trade or the trade was just closed. Opening a new trade.")
            self.open_trade(row)
        else:
            # Compare current trade direction with new signal
            current_dir = open_trade["direction"]
            new_dir = "LONG" if row["prediction"] == 1 else "SHORT"

            if current_dir == new_dir:
                # Same direction - do nothing
                logger.info(f"Signal is {new_dir}, but we already have OPEN {current_dir}. Skipping.")
            else:
                # Opposite direction - close existing trade and open new one
                logger.info(f"Signal is {new_dir}, but open trade is {current_dir}. Reversing...")
                
                # Determine close reason based on price movement
                exit_price = row["close"]
                entry_price = open_trade["entry_price"]
                if current_dir == "LONG":
                    close_reason = "TP" if exit_price > entry_price else "SL"
                else:  # SHORT
                    close_reason = "TP" if exit_price < entry_price else "SL"
                
                # Close existing trade
                self.close_trade(open_trade, reason=close_reason, row=row)
                # Open new trade in opposite direction
                self.open_trade(row)

# ---------- TRADE ANALYSIS ----------
class TradeAnalysys:
    """
    Performs comprehensive analysis on closed trades and stores results in MongoDB.
    Calculates key trading performance metrics including:
    - Win/loss ratios
    - Profit/loss statistics
    - Streak analysis
    - Risk-adjusted returns
    - Fee impact analysis
    """

    def __init__(self, db, config: StrategyConfig):
        """
        Initializes trade analysis with database connection and strategy configuration.
        
        Args:
            db: MongoDB database connection
            config: Strategy configuration parameters
        """
        self.db = db
        self.config = config
        # Trades collection (raw trade data)
        self.trades_collection = db[self.config.collection_name]
        # Analysis collection (performance metrics)
        self.analysis_collection = db[f"Analysis_{self.config.collection_name}"]

    def analyze_and_store(self):
        """
        Main analysis method:
        1. Retrieves all closed trades
        2. Calculates performance metrics
        3. Stores results in analysis collection
        """
        # Retrieve all closed trades sorted by exit time (oldest first)
        closed_trades_cursor = self.trades_collection.find(
            {"status": {"$ne": "OPEN"}}  # Exclude open trades
        ).sort("exit_time", 1)  # Ascending order (oldest first)
        closed_trades = list(closed_trades_cursor)

        # Exit if no closed trades
        if not closed_trades:
            logger.info("No closed trades yet. Skipping analysis.")
            return

        # Basic trade counts -----
        total_trades = len(closed_trades)
        winners = [t for t in closed_trades if t["status"] == "TP"]  # Take profit trades
        losers  = [t for t in closed_trades if t["status"] == "SL"]  # Stop loss trades
        winning_trades = len(winners)
        losing_trades  = len(losers)

        # Streak analysis -----
        max_winning_streak = 0  # Longest consecutive wins
        max_losing_streak  = 0  # Longest consecutive losses
        current_win_streak = 0  # Current winning streak count
        current_loss_streak = 0  # Current losing streak count

        # Iterate through trades in chronological order
        for trade in closed_trades:
            if trade["status"] == "TP":
                current_win_streak += 1
                # Update max streak if current is longer
                max_winning_streak = max(max_winning_streak, current_win_streak)
                current_loss_streak = 0  # Reset losing streak
            elif trade["status"] == "SL":
                current_loss_streak += 1
                # Update max streak if current is longer
                max_losing_streak = max(max_losing_streak, current_loss_streak)
                current_win_streak = 0  # Reset winning streak
            else:  # Other statuses (shouldn't occur but safety)
                current_win_streak = 0
                current_loss_streak = 0

        # Profit/Loss calculations -----
        sum_net_pnl = sum(t.get("net_pnl", 0) for t in closed_trades)  # Net P&L after fees
        sum_profit  = sum(t.get("pnl", 0) for t in closed_trades)      # Gross P&L before fees
        # Average win size (net)
        avg_profit = np.mean([t["net_pnl"] for t in winners]) if winning_trades > 0 else 0.0
        # Average loss size (net)
        avg_loss   = np.mean([t["net_pnl"] for t in losers]) if losing_trades > 0 else 0.0
        total_fees_paid = sum(t.get("total_fees", 0) for t in closed_trades)  # Total commission costs

        # Win rate calculations -----
        # Theoretical break-even win rate based on strategy's risk/reward
        break_even_win_rate = 100 * (1 / (1 + self.config.reward_to_risk_ratio))
        # Actual win rate percentage
        win_rate = (winning_trades / total_trades) * 100.0

        # Account performance -----
        initial_balance = self.config.initial_balance
        net_balance = initial_balance + sum_net_pnl  # Current balance after fees
        balance     = initial_balance + sum_profit    # Current balance before fees
        # Return on Investment percentage
        roi         = ((net_balance - initial_balance) / initial_balance) * 100.0

        # Compile analysis results -----
        analysis_result = {
            "timestamp": datetime.now(),  # Analysis timestamp
            "Total Trades": total_trades,
            "Winning Trades": winning_trades,
            "Losing Trades": losing_trades,
            "Max Winning Streak": int(max_winning_streak),
            "Max Losing Streak": int(max_losing_streak),
            "Avg Profit Per Trade": float(avg_profit),  # Average net win
            "Avg Loss Per Trade": float(avg_loss),      # Average net loss
            "Total Fees Paid": float(total_fees_paid),  # Total commission costs
            "Break-even Win Rate (%)": float(break_even_win_rate),  # Required win rate
            "Win Rate (%)": float(win_rate),            # Actual win rate
            "ROI (%)": float(roi),                     # Return on investment
            "NET Final Balance": float(net_balance),    # Balance after fees
            "Final Balance": float(balance)             # Balance before fees
        }

        # Store/update analysis in MongoDB -----
        self.analysis_collection.update_one(
            {"analysis_id": 1},  # Use constant ID for single document storage
            {"$set": analysis_result},
            upsert=True  # Create if doesn't exist
        )
        # logger.info(f"Trade Analysis stored: {analysis_result}")

# ---------- LIVE TRADING LOOP ----------
# ---------- LIVE TRADING LOOP ----------
def run_live_trading(config: StrategyConfig):
    """
    Main live trading execution loop:
    1. Initializes components
    2. Waits for candle close
    3. Fetches market data
    4. Processes data through feature pipeline
    5. Retrieves sentiment data
    6. Makes AI predictions
    7. Executes trading decisions
    
    Runs continuously until interrupted.
    """
    # Initialize AI prediction model
    ai_model = AIModel(config)
    # Initialize trading simulation engine
    trading_sim = TradingSimulation(config)
    # Convert timeframe to minutes for sleep calculation
    tf_minutes = MarketDataFetcher.timeframe_to_minutes(config.TIMEFRAME)
    # Track last processed timestamp for incremental updates
    last_processed_ts = None

    # Continuous trading loop
    while True:
        # Sleep until next candle close (minus safety buffer)
        MarketDataFetcher.sleep_until_candle_close(tf_minutes)

        # Fetch OHLCV data from exchange
        df = MarketDataFetcher.fetch_binance_futures_ohlcv(
            symbol=config.SYMBOL,
            timeframe=config.TIMEFRAME,
            limit=config.LIMIT,
            last_known_ts=last_processed_ts  # For incremental fetching
        )

        # Handle empty data scenarios
        if df is None or df.empty:
            logger.warning("No data fetched. Skipping iteration.")
            continue

        # Update last processed timestamp (most recent candle)
        last_processed_ts = df.iloc[-1]["timestamp"]

        # ===== FEATURE ENGINEERING PIPELINE =====
        # 1. Calculate technical indicators
        df = TechnicalIndicators.calculate_indicators(df, config)
        # 2. Calculate derived features
        df = DerivedFeatures.calculate_features(df, config)
        # 3. Compute adaptive lookahead period
        df = LabelingFeature.compute_lookahead_period(df, config)
        # 4. Identify market structure levels
        df = LabelingFeature.compute_market_structure(df, config)
        # 5. Calculate momentum features
        df = LabelingFeature.compute_momentum_features(df, config)
        # 6. Compute Lorentzian distance (feature space movement)
        df = LabelingFeature.compute_lorentzian_distance(df, config)
        # 7. Apply candle labeling rules
        df = CandelLabeling.label_candles(df, config)

        # Optimize: Keep only most recent 1000 rows for performance
        df = df.tail(1000)

        # ===== SENTIMENT DATA INTEGRATION =====
        # Get timestamp of latest candle for sentiment lookup
        last_ts = df.iloc[-1]["timestamp"]
        try:
            # Request sentiment data for the current period
            sentiment_response = requests.get(
                SENTIMENT_API_URL,
                params={"timestamp": last_ts.isoformat()}  # ISO format for API
            )
            if sentiment_response.status_code == 200:
                # Parse JSON response (dict keyed by 5-min buckets)
                sentiment_data = sentiment_response.json()
            else:
                logger.warning(f"Error calling sentiment API: {sentiment_response.text}")
                sentiment_data = {}  # Fallback to empty data
        except Exception as e:
            logger.error(f"Failed to fetch sentiment data: {e}")
            sentiment_data = {}  # Fallback on connection errors

        # Initialize sentiment column
        df["sentiment"] = np.nan

        # Map sentiment scores to each candle
        for idx in df.index:
            row_time = df.loc[idx, "timestamp"]
            # Round down to nearest 5-minute bucket for consistent API lookup
            row_floor = row_time.replace(second=0, microsecond=0)
            # Calculate 5-minute bucket (0,5,10...55)
            minute_bucket = (row_floor.minute // 5) * 5
            # Create bucket timestamp (e.g., 2023-01-01T12:05:00)
            row_bucket = row_floor.replace(minute=minute_bucket)
            
            # Convert to ISO format for API key matching
            bucket_key = row_bucket.isoformat()

            # Retrieve sentiment score if available
            if bucket_key in sentiment_data:
                sentiment_obj = sentiment_data[bucket_key]
                # Use normalized score, default to neutral 50 if missing
                score = sentiment_obj.get("normalized_overall_weighted_sentiment_score", 50)
                df.loc[idx, "sentiment"] = score
            else:
                # Neutral score when data is unavailable
                df.loc[idx, "sentiment"] = 50.0

        # ===== AI PREDICTION =====
        # Train model and get prediction for latest candle
        df = ai_model.train_and_predict(df)

        # ===== TRADING EXECUTION =====
        # Extract latest data point
        latest_row = df.iloc[-1]
        # Log prediction and sentiment for monitoring
        logger.info(f"[{config.SYMBOL} {config.TIMEFRAME}] Latest candle prediction => {latest_row.get('prediction', np.nan)}")
        logger.info(f"[{config.SYMBOL} {config.TIMEFRAME}] Latest candle sentiment => {latest_row.get('sentiment', np.nan)}")
        
        # Execute trading decision based on signal
        trading_sim.handle_signal(latest_row)

# ---------- HEALTH CHECK ENDPOINT USING FLASK ----------
# Initialize Flask application for health checks and monitoring
app = Flask(__name__)

@app.route("/")
def health_check():
    """
    Health check endpoint for monitoring and container orchestration.
    
    Returns:
        HTTP 200 response with status message when service is operational.
    """
    return "Bot is Running!", 200


# ---------- MAIN EXECUTION BLOCK ----------
if __name__ == "__main__":
    """
    Main application entry point:
    1. Creates strategy configurations for multiple symbols
    2. Launches trading threads for each symbol
    3. Starts Flask health check server
    """
    
    # Define trading configurations for multiple symbols
    configs = [
        # Bitcoin configuration
        StrategyConfig(SYMBOL='BTC/USDT', TIMEFRAME='5m'),
        # Ethereum configuration
        StrategyConfig(SYMBOL='ETH/USDT', TIMEFRAME='5m'),
        # Binance Coin configuration
        StrategyConfig(SYMBOL='BNB/USDT', TIMEFRAME='5m'),
        # Solana configuration
        StrategyConfig(SYMBOL='SOL/USDT', TIMEFRAME='5m'),
        # Meme coin configuration (PEPE)
        StrategyConfig(SYMBOL='1000PEPE/USDT', TIMEFRAME='5m')
    ]

    # Container for trading threads
    trading_threads = []
    
    # Create and start a trading thread for each configuration
    for conf in configs:
        # Create thread targeting the live trading function
        t = threading.Thread(
            target=run_live_trading,  # Main trading function
            args=(conf,),              # Pass configuration as argument
            daemon=True                # Daemonize thread (terminates when main exits)
        )
        t.start()  # Launch thread
        trading_threads.append(t)  # Track thread reference
        logger.info(f"Started trading thread for {conf.SYMBOL} on {conf.TIMEFRAME} timeframe")

    # Run the Flask health check server
    logger.info(f"Starting health check server on port {PORT}")
    app.run(
        host="0.0.0.0",  # Bind to all network interfaces
        port=PORT        # Use configured port
    )
