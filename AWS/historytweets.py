"""
Twitter Sentiment Scraper – 15‑day window + auto‑cookie refresh
==============================================================
• Scrapes each account for the previous 15 days, repeats every 10 min.
• Detects expired cookies → prompts one manual login → saves new cookies.
• Always writes the *freshest* cookies to twitter_cookies.json so you can
  restart the script without logging in again.
"""

import json, os, time, random, logging, threading
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple, Optional

from flask import Flask, jsonify, request
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import (
    NoSuchElementException, TimeoutException, WebDriverException
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ───────────────────────── CONFIG ──────────────────────────
COOKIES_FILE         = "twitter_cookies.json"
HISTORY_TWEETS_FILE  = "historytweets.json"

MAX_DAYS_BACK        = 15             # ← scrape this many days
SCRAPE_CYCLE_SECONDS = 600            # 10‑min pause between cycles
ACCOUNT_PAUSE_RANGE  = (4, 9)         # seconds between accounts
DAY_PAUSE_RANGE      = (5, 10)        # seconds between day windows
MAX_TWEETS_PER_DAY   = 20

HEADLESS_SCRAPE      = False           # False = watch Chrome UI

# ───────────────────────── LOGGING ─────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ─────────────────────── FINBERT SETUP ─────────────────────
logging.info("Loading FinBERT…")
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch, scipy

_FINBERT_LOCAL = "./finbert_local"
if os.path.exists(_FINBERT_LOCAL):
    finbert_tokenizer = AutoTokenizer.from_pretrained(_FINBERT_LOCAL)
    finbert_model     = AutoModelForSequenceClassification.from_pretrained(_FINBERT_LOCAL)
else:
    finbert_tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
    finbert_model     = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
    os.makedirs(_FINBERT_LOCAL, exist_ok=True)
    finbert_tokenizer.save_pretrained(_FINBERT_LOCAL)
    finbert_model.save_pretrained(_FINBERT_LOCAL)
logging.info("FinBERT ready.")

# ───────────────────────── FLASK APP ───────────────────────
app = Flask(__name__)
tweets_db: List[Dict] = []

# ─────────────────── SELENIUM HELPERS ──────────────────────
def _build_driver(headless: bool = HEADLESS_SCRAPE) -> uc.Chrome:
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    return uc.Chrome(options=opts)

def save_cookies(driver: uc.Chrome) -> None:
    with open(COOKIES_FILE, "w", encoding="utf-8") as fp:
        json.dump(driver.get_cookies(), fp, indent=2)
    logging.info("💾 Cookies written to %s", COOKIES_FILE)

def load_cookies(driver: uc.Chrome) -> bool:
    if not os.path.exists(COOKIES_FILE):
        return False
    try:
        with open(COOKIES_FILE, "r", encoding="utf-8") as fp:
            cookies = json.load(fp)
    except Exception as exc:
        logging.warning("Cookie file unreadable: %s", exc)
        return False
    driver.get("https://x.com")
    time.sleep(2)
    for c in cookies:
        c["domain"] = ".x.com"
        try: driver.add_cookie(c)
        except WebDriverException: pass
    driver.refresh()
    time.sleep(3)
    return True

def is_logged_in(driver: uc.Chrome) -> bool:
    driver.get("https://x.com/home")
    time.sleep(2)
    return "login" not in driver.current_url.lower()

def refresh_cookies_via_manual_login() -> None:
    logging.info("⚠️  Opening visible browser for manual login…")
    drv = _build_driver(headless=False)
    drv.get("https://x.com/login")
    input("👉  Complete login in the window, then press ENTER here… ")
    save_cookies(drv)
    drv.quit()
    logging.info("✅  Manual login complete, cookies refreshed.")

def get_logged_in_driver() -> uc.Chrome:
    for attempt in (1, 2):
        drv = _build_driver()
        if load_cookies(drv) and is_logged_in(drv):
            save_cookies(drv)               # ← always persist freshest cookies
            logging.info("Session valid.")
            return drv
        drv.quit()
        if attempt == 1:
            refresh_cookies_via_manual_login()
    raise RuntimeError("Could not establish logged‑in session.")

# ────────────────────── FINBERT HELPER ─────────────────────
def predict_sentiment(text: str) -> Tuple[str, float]:
    with torch.no_grad():
        inp = finbert_tokenizer(text, return_tensors="pt",
                                padding=True, truncation=True, max_length=512)
        probs = scipy.special.softmax(finbert_model(**inp).logits.numpy().squeeze())
        mapping = {finbert_model.config.id2label[i]: p for i, p in enumerate(probs)}
    label = max(mapping, key=mapping.get)
    return label, float(mapping[label])

# ─────────────────────── SCRAPING CORE ─────────────────────
def _scroll(driver: uc.Chrome, seconds: int = 10):
    end = time.time() + seconds
    last = driver.execute_script("return document.body.scrollHeight")
    while time.time() < end:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new = driver.execute_script("return document.body.scrollHeight")
        if new == last:
            break
        last = new

def scrape_tweets_advanced(driver: uc.Chrome, account: str,
                           since_date: str, until_date: str,
                           max_tweets: int = MAX_TWEETS_PER_DAY) -> List[Dict]:
    try:
        query = f"from%3A{account}%20since%3A{since_date}%20until%3A{until_date}"
        search_url = f"https://x.com/search?q={query}&f=live"
        logging.info("🔍 Searching URL: %s", search_url)
        driver.get(search_url)

        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "article[data-testid='tweet']"))
            )
            logging.info("✅ Found tweet elements on page")
        except TimeoutException:
            logging.warning("⏰ Timeout waiting for tweets - checking page content...")
            page_text = driver.page_source[:500]  # First 500 chars
            if "login" in page_text.lower() or "sign in" in page_text.lower():
                logging.error("❌ Login wall detected!")
            else:
                logging.warning("⚠️  No tweets found for %s (%s → %s)", account, since_date, until_date)
            return []

        _scroll(driver, seconds=10)
        elems = driver.find_elements(By.CSS_SELECTOR, "article[data-testid='tweet']")
        logging.info("📊 Found %d tweet elements after scrolling", len(elems))
        
        tweets: List[Dict] = []
        for i, e in enumerate(elems[:max_tweets]):
            try: 
                txt = e.find_element(By.CSS_SELECTOR, "div[data-testid='tweetText']").text
                if not txt.strip():
                    logging.warning("⚠️  Empty tweet text for element %d", i)
                    continue
            except NoSuchElementException: 
                logging.warning("⚠️  No tweet text found for element %d", i)
                continue
                
            tid = e.get_attribute("data-tweet-id") or f"unknown_{i}"
            def grab(css):
                try:  return e.find_element(By.CSS_SELECTOR, css).text or "0"
                except NoSuchElementException: return "0"
            likes, rts, cmts = grab("div[data-testid='like']"), grab("div[data-testid='retweet']"), grab("div[data-testid='reply']")
            
            try: ts = e.find_element(By.TAG_NAME, "time").get_attribute("datetime")
            except NoSuchElementException: ts = datetime.now(timezone.utc).isoformat()
            
            sent, prob = predict_sentiment(txt)
            tweet_data = {
                "user": account, "text": txt, "tweet_id": tid,
                "likes": likes, "retweets": rts, "comments": cmts,
                "timestamp": ts, "sentiment": sent, "sentiment_probability": prob,
            }
            tweets.append(tweet_data)
            
        logging.info("✅ %s – Successfully extracted %d tweets (%s → %s)", account, len(tweets), since_date, until_date)
        if tweets:
            logging.info("📝 Sample tweet: %s...", tweets[0]["text"][:100])
        return tweets
        
    except Exception as e:
        logging.error("❌ Error scraping %s: %s", account, str(e))
        import traceback
        logging.error("❌ Traceback: %s", traceback.format_exc())
        return []

def append_all_tweets(new: List[Dict]):
    """Save all tweets without checking for duplicates"""
    logging.info("💾 Attempting to save %d tweets to file: %s", len(new), HISTORY_TWEETS_FILE)
    
    try:
        if os.path.exists(HISTORY_TWEETS_FILE):
            with open(HISTORY_TWEETS_FILE, "r", encoding="utf-8") as fp:
                old = json.load(fp)
            logging.info("📂 Loaded %d existing tweets from file", len(old))
        else:
            old = []
            logging.info("📂 No existing file found, starting fresh")
        
        # Add all new tweets without duplicate checking
        if new:
            old.extend(new)
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(HISTORY_TWEETS_FILE) if os.path.dirname(HISTORY_TWEETS_FILE) else ".", exist_ok=True)
            
            with open(HISTORY_TWEETS_FILE, "w", encoding="utf-8") as fp:
                json.dump(old, fp, indent=2, ensure_ascii=False)
                fp.flush()  # Force write to disk
                
            # Verify file was written
            if os.path.exists(HISTORY_TWEETS_FILE):
                file_size = os.path.getsize(HISTORY_TWEETS_FILE)
                logging.info("✅ Successfully saved %d new tweets! Total tweets in file: %d (File size: %d bytes)", len(new), len(old), file_size)
            else:
                logging.error("❌ File was not created after writing!")
        else:
            logging.info("⚠️  No tweets to save")
            
    except Exception as e:
        logging.error("❌ Error saving tweets: %s", str(e))
        logging.error("❌ Error type: %s", type(e).__name__)
        import traceback
        logging.error("❌ Traceback: %s", traceback.format_exc())

# ─────────────────────── ACCOUNT LIST ──────────────────────
ACCOUNTS = [
    "CoinDeskMarkets",
    "Cointelegraph", "CointelegraphMT", "TheBlock__", "DecryptMedia",
    "CryptoSlate", "BitcoinMagazine", "MessariCrypto", "binance",
    "BinanceUS", "BinanceWallet", "BinanceAcademy", "CoinMarketCap",
    "coingecko", "Glassnode", "LunarCRUSH", "CryptoWhale",
    "TheCryptoLark", "PompPodcast", "SatoshiLite", "cz_binance",
    "VitalikButerin", "ForbesCrypto", "BloombergCrypto", "CryptoCobain",
    "CryptoRand", "100trillionUSD", "whale_alert", "AltcoinBuzz",
    "IvanOnTech", "BitBoyCrypto", "CryptoMichNL", "CryptoCred",
    "ShillAlerts",
]

# ─────────────────── CONTINUOUS SCRAPER ────────────────────
def _scraper_loop():
    while True:
        driver = get_logged_in_driver()
        for acc in ACCOUNTS:
            logging.info("🔄 Starting to scrape account: %s", acc)
            account_tweets = []  # Collect all tweets for this account
            
            # Scrape all days for this account
            for d in range(MAX_DAYS_BACK):
                since = (datetime.now(timezone.utc) - timedelta(days=d+1)).strftime("%Y-%m-%d")
                until = (datetime.now(timezone.utc) - timedelta(days=d  )).strftime("%Y-%m-%d")
                logging.info("📅 Scraping %s day %d: %s to %s", acc, d+1, since, until)
                tw = scrape_tweets_advanced(driver, acc, since, until)
                account_tweets.extend(tw)  # Add to account collection
                tweets_db.extend(tw)       # Add to in-memory database
                logging.info("📊 Account %s now has %d tweets collected so far", acc, len(account_tweets))
                time.sleep(random.uniform(*DAY_PAUSE_RANGE))
            
            # Save all tweets for this account at once
            logging.info("💾 About to save tweets for account %s (collected: %d tweets)", acc, len(account_tweets))
            if account_tweets:
                append_all_tweets(account_tweets)
                logging.info("✅ Completed account %s: saved %d tweets total", acc, len(account_tweets))
            else:
                logging.info("⚠️  No tweets found for account: %s", acc)
                
            time.sleep(random.uniform(*ACCOUNT_PAUSE_RANGE))
        save_cookies(driver)        # ← persist any refreshed cookies
        driver.quit()
        logging.info("Cycle complete – sleeping %d s.", SCRAPE_CYCLE_SECONDS)
        time.sleep(SCRAPE_CYCLE_SECONDS)

threading.Thread(target=_scraper_loop, daemon=True).start()

# ──────────────────────── FLASK ENDPOINTS ───────────────────
@app.route("/get_recent_tweets")
def recent():
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    return jsonify([t for t in tweets_db if datetime.fromisoformat(t["timestamp"]) > cutoff])

# (All other endpoints from previous version remain unchanged; omitted for brevity.)

@app.route("/session_status")
def session_status():
    return jsonify({"cookies_exist": os.path.exists(COOKIES_FILE)}), 200

# ─────────────────────────── MAIN ───────────────────────────
if __name__ == "__main__":
    # Test file writing capability at startup
    test_data = [{"test": "startup_test", "timestamp": datetime.now(timezone.utc).isoformat()}]
    logging.info("🧪 Testing file write capability...")
    append_all_tweets(test_data)
    
    logging.info("Server ready – scraping last %d days every 10 min (Headless=%s)",
                 MAX_DAYS_BACK, HEADLESS_SCRAPE)
    app.run(host="0.0.0.0", port=5000)
