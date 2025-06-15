from flask import Flask, jsonify, request
from flask_cors import CORS  # <-- For allowing cross-origin requests
import os
import json
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes; allows requests from any origin

# IMPORTANT: This is your new file with the tweets data.
TWEETS_FILE = "temp.json"

# ---------------- HELPER FUNCTIONS ----------------

def parse_timestamp(ts_str: str):
    """
    Parses ISO 8601 formatted timestamp strings into timezone-naive datetime objects.
    
    Handles common variations including:
    - UTC 'Z' suffix notation
    - Timezone offset notation
    - Basic ISO format without timezone
    
    Args:
        ts_str: Timestamp string in ISO 8601 format (e.g., "2023-01-01T12:00:00Z")
        
    Returns:
        Timezone-naive datetime object if parsing succeeds, 
        None if parsing fails.
        
    Example:
        parse_timestamp("2023-01-01T12:00:00Z") -> datetime(2023, 1, 1, 12, 0)
    """
    try:
        # Replace UTC 'Z' suffix with standard UTC offset notation
        normalized_str = ts_str.replace("Z", "+00:00")
        
        # Parse ISO format datetime (handles timezone-aware strings)
        dt = datetime.fromisoformat(normalized_str)
        
        # Convert to timezone-naive format by removing timezone info
        return dt.replace(tzinfo=None)
        
    except (ValueError, TypeError) as e:
        # Handle various parsing errors:
        # - Invalid format
        # - Incorrect data types
        # - Malformed strings
        return None
    
def load_tweets() -> list:
    """
    Safely loads tweets from a JSON file storage.
    
    Returns:
        List of tweet objects if file exists and is valid JSON,
        Empty list if file doesn't exist or contains invalid JSON.
    """
    # Check if tweets file exists before attempting to open
    if not os.path.exists(TWEETS_FILE):
        # Return empty list when file doesn't exist
        return []
    
    # Attempt to open and read the file
    with open(TWEETS_FILE, "r", encoding="utf-8") as f:
        try:
            # Parse JSON content from file
            tweets = json.load(f)
        except Exception as e:
            # Handle any JSON parsing errors (malformed, empty, etc.)
            # Return empty list on failure
            tweets = []
    
    # Return loaded tweets or empty list on error
    return tweets

# --------------- ORIGINAL SENTIMENT-RELATED FUNCTIONS ---------------

def compute_sentiment(tweets: list):
    """
    Computes weighted sentiment metrics from a list of tweets.
    
    Process:
    1. Sorts tweets chronologically
    2. Calculates time-based weights (linear weighting from oldest to newest)
    3. Computes weighted sentiment scores
    4. Normalizes the final score to 0-100 range
    
    Args:
        tweets: List of tweet dictionaries with 'timestamp', 'sentiment', 
                and 'sentiment_probability'
    
    Returns:
        dict: Sentiment metrics with keys:
            - start: ISO timestamp of first tweet
            - end: ISO timestamp of last tweet
            - total_tweets: Count of processed tweets
            - weighted_sentiment_counts: Weighted count by sentiment category
            - overall_weighted_sentiment_score: Raw weighted score
            - normalized_overall_weighted_sentiment_score: Score scaled to 0-100
        None: If input is empty
        dict with error: If timestamp parsing fails
    """
    # Handle empty input
    if not tweets:
        return None

    try:
        # Sort tweets by timestamp (oldest first)
        sorted_tweets = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception as e:
        # Return error if timestamp parsing fails
        return {"error": f"Error parsing timestamps: {e}"}

    # Extract start and end timestamps
    start = parse_timestamp(sorted_tweets[0]['timestamp'])
    end = parse_timestamp(sorted_tweets[-1]['timestamp'])
    # Calculate total time span in seconds
    total_seconds = (end - start).total_seconds() if start and end else 0

    # Initialize tracking variables
    weighted_counts = {"positive": 0, "neutral": 0, "negative": 0}
    overall_weighted_score = 0.0
    # Sentiment value mapping (positive=1, neutral=0, negative=-1)
    sentiment_value_map = {"positive": 1, "neutral": 0, "negative": -1}

    # Process each tweet
    for tweet in sorted_tweets:
        tweet_time = parse_timestamp(tweet.get('timestamp'))
        # Skip if timestamp parsing failed
        if tweet_time is None:
            continue
            
        # Calculate time-based weight (linear progression from 0 to 1)
        if total_seconds > 0:
            # Weight increases linearly from oldest (0) to newest (1)
            weight = (tweet_time - start).total_seconds() / total_seconds
        else:
            # Default weight for single tweet or same-time tweets
            weight = 1
            
        # Extract sentiment and probability
        sentiment = tweet.get("sentiment", "neutral")  # Default to neutral
        prob = tweet.get("sentiment_probability", 0)    # Default to 0 probability

        # Update weighted counts by sentiment category
        weighted_counts[sentiment] += weight
        
        # Calculate contribution to overall score:
        # sentiment_value * probability * time_weight
        overall_weighted_score += sentiment_value_map.get(sentiment, 0) * prob * weight

    n = len(sorted_tweets)
    # Normalize score to 0-100 range
    if n > 1:
        # Calculate theoretical min/max possible scores
        min_possible = - (n - 1) / 2.0   # All tweets negative
        max_possible = (n - 1) / 2.0     # All tweets positive
        
        # Normalize actual score between min and max, then scale to 0-100
        normalized_score = ((overall_weighted_score - min_possible) / 
                           (max_possible - min_possible)) * 100
    else:
        # Default to neutral (50) for single tweet
        normalized_score = 50

    # Compile results
    return {
        "start": start.isoformat() if start else None,  # ISO format or None
        "end": end.isoformat() if end else None,
        "total_tweets": n,
        "weighted_sentiment_counts": weighted_counts,
        "overall_weighted_sentiment_score": overall_weighted_score,
        "normalized_overall_weighted_sentiment_score": normalized_score
    }

def compute_time_decay_sentiment_up_to(tweets_sorted, cutoff_time):
    """
    Computes time-decayed sentiment scores for tweets up to a cutoff time.
    
    The weighting scheme:
    - Most recent tweet (closest to cutoff) has weight ≈ 1
    - Oldest tweet has weight ≈ 0
    - Linear decay from newest to oldest
    
    Args:
        tweets_sorted: Pre-sorted list of tweets (oldest first)
        cutoff_time: datetime threshold (include tweets ≤ this time)
        
    Returns:
        dict: Sentiment metrics (same structure as compute_sentiment)
        None: If no tweets in time range
    """
    # Filter tweets to include only those before/at cutoff_time
    relevant = [
        t for t in tweets_sorted 
        if parse_timestamp(t['timestamp']) and  # Valid timestamp
        parse_timestamp(t['timestamp']) <= cutoff_time  # Before cutoff
    ]
    
    # Return None if no tweets in range
    if not relevant:
        return None

    # Sort relevant tweets chronologically (oldest first)
    relevant_sorted = sorted(relevant, key=lambda t: parse_timestamp(t['timestamp']))
    
    # Get earliest tweet timestamp in filtered set
    earliest = parse_timestamp(relevant_sorted[0]['timestamp'])
    
    # Calculate total time span from first tweet to cutoff
    total_seconds = (cutoff_time - earliest).total_seconds() if earliest else 0
    
    # Handle edge case: all tweets at same time or cutoff=earliest
    if total_seconds <= 0:
        # Fall back to simple sentiment calculation without time decay
        return compute_sentiment(relevant_sorted)

    # Sentiment value mapping (positive=1, neutral=0, negative=-1)
    sentiment_value_map = {"positive": 1, "neutral": 0, "negative": -1}
    weighted_counts = {"positive": 0, "neutral": 0, "negative": 0}
    overall_weighted_score = 0.0

    # Process each relevant tweet
    for tw in relevant_sorted:
        tw_time = parse_timestamp(tw['timestamp'])
        if tw_time is None:  # Skip if timestamp parsing failed
            continue
            
        # Calculate time-based weight (fraction of total time range)
        # - Oldest tweet: fraction_of_range ≈ 0
        # - Newest tweet: fraction_of_range ≈ 1
        fraction_of_range = (tw_time - earliest).total_seconds() / total_seconds

        # Get sentiment and probability
        sentiment = tw.get("sentiment", "neutral")  # Default to neutral
        prob = tw.get("sentiment_probability", 0)    # Default to 0 probability

        # Update sentiment counts with time weight
        weighted_counts[sentiment] += fraction_of_range
        
        # Calculate sentiment contribution:
        # sentiment_value × probability × time_weight
        overall_weighted_score += sentiment_value_map.get(sentiment, 0) * prob * fraction_of_range

    # Get count of relevant tweets
    n = len(relevant_sorted)
    
    # Normalize score to 0-100 range
    if n > 1:
        # Theoretical min/max scores based on tweet count
        min_possible = - (n - 1) / 2.0  # All negative
        max_possible = (n - 1) / 2.0    # All positive
        
        # Scale actual score between min/max to 0-100 range
        normalized_score = ((overall_weighted_score - min_possible) / 
                          (max_possible - min_possible)) * 100
    else:
        # Default to neutral for single tweet
        normalized_score = 50

    # Compile results
    return {
        "start": earliest.isoformat() if earliest else None,  # ISO format
        "end": cutoff_time.isoformat(),  # User-provided cutoff
        "total_tweets": n,
        "weighted_sentiment_counts": weighted_counts,
        "overall_weighted_sentiment_score": overall_weighted_score,
        "normalized_overall_weighted_sentiment_score": normalized_score
    }
# ---------------- FIXED RANGE ENDPOINTS ----------------
@app.route('/get_weighted_sentiment_all', methods=['GET'])
def get_weighted_sentiment_all():
    """
    Endpoint: /get_weighted_sentiment_all
    Method: GET
    Description: Computes weighted sentiment metrics for ALL available tweets.
    
    Response:
      - 200: Success with sentiment metrics
      - 404: No tweets available
      - 500: Computation error
    """
    # Load tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Compute sentiment metrics
    result = compute_sentiment(tweets)
    
    # Handle computation errors
    if not result or "error" in result:
        return jsonify(result), 500  # Internal Server Error
    
    return jsonify(result), 200  # OK


@app.route('/get_sentiment_today', methods=['GET'])
def get_sentiment_today():
    """
    Endpoint: /get_sentiment_today
    Method: GET
    Description: Computes sentiment metrics for tweets from TODAY (current day in system time).
    
    Response:
      - 200: Success with today's sentiment metrics
      - 404: No tweets available or no tweets for today
    """
    # Load tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Filter tweets for current day
    today = datetime.now().date()
    filtered = [
        t for t in tweets 
        if parse_timestamp(t['timestamp']) and  # Valid timestamp
        parse_timestamp(t['timestamp']).date() == today  # Today's date
    ]
    
    if not filtered:
        return jsonify({"error": "No tweets for today"}), 404  # Not Found
    
    # Compute and return metrics
    result = compute_sentiment(filtered)
    return jsonify(result), 200  # OK


@app.route('/get_sentiment_week', methods=['GET'])
def get_sentiment_week():
    """
    Endpoint: /get_sentiment_week
    Method: GET
    Description: Computes sentiment metrics for tweets from the LAST 7 DAYS.
    
    Response:
      - 200: Success with week's sentiment metrics
      - 404: No tweets available or no tweets in time range
    """
    # Load tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Define time range (last 7 days)
    now = datetime.now()
    one_week_ago = now - timedelta(days=7)
    
    # Filter tweets within date range
    filtered = [
        t for t in tweets 
        if one_week_ago <= parse_timestamp(t['timestamp']) <= now
    ]
    
    if not filtered:
        return jsonify({"error": "No tweets in the past week"}), 404  # Not Found
    
    # Compute and return metrics
    result = compute_sentiment(filtered)
    return jsonify(result), 200  # OK


@app.route('/get_sentiment_month', methods=['GET'])
def get_sentiment_month():
    """
    Endpoint: /get_sentiment_month
    Method: GET
    Description: Computes sentiment metrics for tweets from the LAST 30 DAYS.
    
    Response:
      - 200: Success with month's sentiment metrics
      - 404: No tweets available or no tweets in time range
    """
    # Load tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Define time range (last 30 days)
    now = datetime.now()
    one_month_ago = now - timedelta(days=30)
    
    # Filter tweets within date range
    filtered = [
        t for t in tweets 
        if one_month_ago <= parse_timestamp(t['timestamp']) <= now
    ]
    
    if not filtered:
        return jsonify({"error": "No tweets in the past month"}), 404  # Not Found
    
    # Compute and return metrics
    result = compute_sentiment(filtered)
    return jsonify(result), 200  # OK


@app.route('/get_sentiment_range', methods=['GET'])
def get_sentiment_range():
    """
    Endpoint: /get_sentiment_range
    Method: GET
    Description: Computes sentiment metrics for a CUSTOM DATE RANGE.
    
    Query Parameters:
      - start: ISO timestamp string (required)
      - end: ISO timestamp string (required)
    
    Response:
      - 200: Success with custom range sentiment metrics
      - 400: Missing or invalid parameters
      - 404: No tweets available or no tweets in specified range
    """
    # Load tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Get query parameters
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    
    # Validate required parameters
    if not start_str or not end_str:
        return jsonify({"error": "Please provide both 'start' and 'end' date parameters"}), 400  # Bad Request
    
    # Parse timestamps
    start_date = parse_timestamp(start_str)
    end_date = parse_timestamp(end_str)
    
    # Validate timestamp parsing
    if not start_date or not end_date:
        return jsonify({"error": "Error parsing 'start' or 'end' date"}), 400  # Bad Request
    
    # Filter tweets within custom date range
    filtered = [
        t for t in tweets 
        if start_date <= parse_timestamp(t['timestamp']) <= end_date
    ]
    
    if not filtered:
        return jsonify({"error": "No tweets in the specified date range"}), 404  # Not Found
    
    # Compute and return metrics
    result = compute_sentiment(filtered)
    return jsonify(result), 200  # OK

# ---------------- GROUPED ENDPOINTS FOR COMPARISONS ----------------

@app.route('/get_sentiment_by_day', methods=['GET'])
def get_sentiment_by_day():
    """
    Endpoint: /get_sentiment_by_day
    Method: GET
    Description: Computes sentiment metrics grouped by DAY.
    
    Response:
      - 200: Success with daily sentiment metrics
        Format: { "YYYY-MM-DD": {sentiment_metrics}, ... }
      - 404: No tweets available
    """
    # Load all tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Group tweets by day (YYYY-MM-DD format)
    groups = {}
    for tweet in tweets:
        dt = parse_timestamp(tweet['timestamp'])
        if not dt:  # Skip if timestamp parsing failed
            continue
        # Create day key in format "2023-01-01"
        day_key = dt.strftime("%Y-%m-%d")
        # Initialize list for day if needed, append tweet
        groups.setdefault(day_key, []).append(tweet)
    
    # Compute sentiment for each day group
    results = {}
    for day, group in groups.items():
        sentiment = compute_sentiment(group)
        results[day] = sentiment
    
    return jsonify(results), 200  # OK


@app.route('/get_sentiment_by_week', methods=['GET'])
def get_sentiment_by_week():
    """
    Endpoint: /get_sentiment_by_week
    Method: GET
    Description: Computes sentiment metrics grouped by ISO WEEK.
    
    Response:
      - 200: Success with weekly sentiment metrics
        Format: { "YYYY-Www": {sentiment_metrics}, ... }
        (e.g., "2023-W01" for first week of 2023)
      - 404: No tweets available
    """
    # Load all tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Group tweets by ISO week (YYYY-Www format)
    groups = {}
    for tweet in tweets:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:  # Skip if timestamp parsing failed
            continue
        # Get ISO year, week, and weekday
        iso_year, iso_week, _ = dt.isocalendar()
        # Create week key in format "2023-W01"
        week_key = f"{iso_year}-W{iso_week:02d}"
        # Initialize list for week if needed, append tweet
        groups.setdefault(week_key, []).append(tweet)
    
    # Compute sentiment for each week group
    results = {}
    for week, group in groups.items():
        sentiment = compute_sentiment(group)
        results[week] = sentiment
    
    return jsonify(results), 200  # OK


@app.route('/get_sentiment_by_month', methods=['GET'])
def get_sentiment_by_month():
    """
    Endpoint: /get_sentiment_by_month
    Method: GET
    Description: Computes sentiment metrics grouped by MONTH.
    
    Response:
      - 200: Success with monthly sentiment metrics
        Format: { "YYYY-MM": {sentiment_metrics}, ... }
      - 404: No tweets available
    """
    # Load all tweets from storage
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404  # Not Found
    
    # Group tweets by month (YYYY-MM format)
    groups = {}
    for tweet in tweets:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:  # Skip if timestamp parsing failed
            continue
        # Create month key in format "2023-01"
        month_key = dt.strftime("%Y-%m")
        # Initialize list for month if needed, append tweet
        groups.setdefault(month_key, []).append(tweet)
    
    # Compute sentiment for each month group
    results = {}
    for month, group in groups.items():
        sentiment = compute_sentiment(group)
        results[month] = sentiment
    
    return jsonify(results), 200  # OK

# ---------------- 5-MIN AND HOUR GROUPED ENDPOINTS ----------------
# ---------------------------------------------------------------------------
@app.route('/get_sentiment_by_5min', methods=['GET'])
def get_sentiment_by_5min():
    """Return blended sentiment metrics in **five‑minute** intervals.

    The beginning of each 5‑minute window is used as the JSON key in the
    response (ISO‑8601 format).

    HTTP 404 → {"error": "No tweets available"} when the cache is empty.
    """

    # 1️⃣  Load tweets -----------------------------------------------------------------
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # 2️⃣  Sort tweets chronologically -------------------------------------------------
    try:
        tweets_sorted = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception:  # Defensive: if sorting fails, fall back to original order
        tweets_sorted = tweets

    # 3️⃣  Group tweets into 5‑minute buckets ------------------------------------------
    groups: dict[str, list] = {}
    for tweet in tweets_sorted:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:  # Skip malformed timestamps
            continue

        # Truncate seconds & microseconds, then *floor* minutes to nearest 5
        dt_floor = dt.replace(second=0, microsecond=0)
        minute_bucket = (dt_floor.minute // 5) * 5
        bucket_start = dt_floor.replace(minute=minute_bucket)

        key = bucket_start.isoformat()
        groups.setdefault(key, []).append(tweet)

    # 4️⃣  Helper to merge current‑bucket + historical sentiment -----------------------
    def compute_combined_sentiment(current_tweets, historical_tweets):
        """Blend current and historical sentiment.

        When either list is empty, fall back to a neutral baseline so that the
        endpoint never returns NULL values (important for graphs that expect a
        complete timeline).
        """
        # Neutral fallback values if sentiment cannot be computed
        default_sentiment = {
            "normalized_overall_weighted_sentiment_score": 50,  # Mid‑point
            "overall_weighted_sentiment_score": 0,
            "total_tweets": 0,
        }

        # Sentiment for tweets in the *current* bucket (can be empty)
        from_current = compute_sentiment(current_tweets) or default_sentiment

        # Sentiment for *all tweets before* the bucket (may be empty)
        from_history = (
            compute_sentiment(historical_tweets) if historical_tweets else None
        )

        # If no historical sentiment exists yet, simply return the current one
        if not from_history:
            return from_current

        # Weighted average – emphasise history (70 %) but allow recent change
        c_norm = from_current.get("normalized_overall_weighted_sentiment_score", 50)
        h_norm = from_history.get("normalized_overall_weighted_sentiment_score", 50)
        combined_norm = 0.7 * h_norm + 0.3 * c_norm

        c_ov = from_current.get("overall_weighted_sentiment_score", 0)
        h_ov = from_history.get("overall_weighted_sentiment_score", 0)
        combined_ov = 0.7 * h_ov + 0.3 * c_ov

        # Package everything in a single dict for front‑end convenience
        return {
            "historical_sentiment": from_history,
            "current_bucket_sentiment": from_current,
            "combined_overall_weighted_sentiment_score": combined_ov,
            "combined_normalized_overall_weighted_sentiment_score": combined_norm,
            "total_tweets": from_history.get("total_tweets", 0)
            + from_current.get("total_tweets", 0),
        }

    # 5️⃣  Build the response -----------------------------------------------------------
    results: dict[str, dict] = {}
    for bucket_key, bucket_tweets in groups.items():
        bucket_start = parse_timestamp(bucket_key)
        # Tweets strictly *before* this bucket
        historical_tweets = [
            t for t in tweets_sorted if parse_timestamp(t['timestamp']) < bucket_start
        ]
        results[bucket_key] = compute_combined_sentiment(bucket_tweets, historical_tweets)

    return jsonify(results), 200

# ---------------------------------------------------------------------------
#  Hourly sentiment endpoint
# ---------------------------------------------------------------------------
@app.route('/get_sentiment_by_hour', methods=['GET'])
def get_sentiment_by_hour():
    """Return blended sentiment metrics in **hourly** intervals.

    Logic mirrors *get_sentiment_by_5min* but with a 60‑minute bucket size.
    """

    # 1️⃣  Load tweets -----------------------------------------------------------------
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # 2️⃣  Sort tweets chronologically -------------------------------------------------
    try:
        tweets_sorted = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception:
        tweets_sorted = tweets  # Safe fallback

    # 3️⃣  Group tweets into 1‑hour buckets --------------------------------------------
    groups: dict[str, list] = {}
    for tweet in tweets_sorted:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:
            continue  # Skip malformed timestamp

        bucket = dt.replace(minute=0, second=0, microsecond=0)
        key = bucket.isoformat()
        groups.setdefault(key, []).append(tweet)

    # 4️⃣  Re‑use the same helper declared above ---------------------------------------
    def compute_combined_sentiment(current_tweets, historical_tweets):
        """Blend current hourly sentiment with historical sentiment."""

        default_sentiment = {
            "normalized_overall_weighted_sentiment_score": 50,
            "overall_weighted_sentiment_score": 0,
            "total_tweets": 0,
        }
        from_current = compute_sentiment(current_tweets) or default_sentiment
        from_history = (
            compute_sentiment(historical_tweets) if historical_tweets else None
        )

        if not from_history:
            return from_current

        c_norm = from_current.get("normalized_overall_weighted_sentiment_score", 50)
        h_norm = from_history.get("normalized_overall_weighted_sentiment_score", 50)
        combined_norm = 0.7 * h_norm + 0.3 * c_norm

        c_ov = from_current.get("overall_weighted_sentiment_score", 0)
        h_ov = from_history.get("overall_weighted_sentiment_score", 0)
        combined_ov = 0.7 * h_ov + 0.3 * c_ov

        return {
            "historical_sentiment": from_history,
            "current_bucket_sentiment": from_current,
            "combined_overall_weighted_sentiment_score": combined_ov,
            "combined_normalized_overall_weighted_sentiment_score": combined_norm,
            "total_tweets": from_history.get("total_tweets", 0)
            + from_current.get("total_tweets", 0),
        }

    # 5️⃣  Build the response -----------------------------------------------------------
    results: dict[str, dict] = {}
    for bucket_key, bucket_tweets in groups.items():
        bucket_start = parse_timestamp(bucket_key)
        historical_tweets = [
            t for t in tweets_sorted if parse_timestamp(t['timestamp']) < bucket_start
        ]
        results[bucket_key] = compute_combined_sentiment(bucket_tweets, historical_tweets)

    return jsonify(results), 200

# ---------------- UPDATED /get_sentiment_iterations ENDPOINT ----------------
@app.route('/get_sentiment_iterations', methods=['GET'])
def get_sentiment_iterations():
    """Return decayed sentiment scores for 1000 five-minute buckets ending at a given time."""

    # 1️⃣  Load all tweets ----------------------------------------------------------------
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # 2️⃣  Parse query parameter "timestamp" ---------------------------------------------
    ts_str = request.args.get("timestamp")
    if not ts_str:
        return jsonify({"error": "Please provide a 'timestamp' parameter in ISO format."}), 400

    target_time = parse_timestamp(ts_str)
    if target_time is None:
        return jsonify({"error": "Error parsing provided timestamp."}), 400

    # 3️⃣  Round down to nearest 5-minute mark --------------------------------------------
    target_time = target_time.replace(second=0, microsecond=0)
    minute_bucket = (target_time.minute // 5) * 5
    target_bucket = target_time.replace(minute=minute_bucket)

    # 4️⃣  Sort tweets chronologically -----------------------------------------------------
    try:
        tweets_sorted = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception:
        tweets_sorted = tweets  # Fallback if parsing fails

    # 5️⃣  Walk backwards 1000 buckets and compute decayed sentiment -----------------------
    iterations = 1000
    results = {}

    for i in range(iterations):
        # Compute end time for current iteration (e.g., now - 5*i minutes)
        bucket_end = target_bucket - timedelta(minutes=5 * i)

        # Compute decayed sentiment up to this time point (helper handles time decay)
        decayed_senti = compute_time_decay_sentiment_up_to(tweets_sorted, bucket_end)

        # If no sentiment could be computed (e.g., no tweets yet), fill with neutral default
        if decayed_senti is None:
            decayed_senti = {
                "start": None,
                "end": bucket_end.isoformat(),
                "total_tweets": 0,
                "weighted_sentiment_counts": {"positive": 0, "neutral": 0, "negative": 0},
                "overall_weighted_sentiment_score": 0,
                "normalized_overall_weighted_sentiment_score": 50
            }

        results[bucket_end.isoformat()] = decayed_senti

    # 6️⃣  Return final time-decayed sentiment trace --------------------------------------
    return jsonify(results), 200

# ---------------- NEW DYNAMIC ROUTES FOR historytweets.json FIELDS ----------------
@app.route('/get_tweets_by_user', methods=['GET'])
def get_tweets_by_user():
    """
    Return all tweets by a specified user.

    Usage: /get_tweets_by_user?user=<username>
    Example: /get_tweets_by_user?user=elonmusk

    If user not found or missing, returns 400/404 errors accordingly.
    """
    username = request.args.get("user")
    if not username:
        return jsonify({"error": "Please provide a 'user' parameter"}), 400

    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # Filter tweets matching user name (case-insensitive)
    filtered = [t for t in tweets if t.get("user", "").lower() == username.lower()]

    if not filtered:
        return jsonify({"message": f"No tweets found for user '{username}'"}), 404

    return jsonify(filtered), 200

@app.route('/search_tweets', methods=['GET'])
def search_tweets():
    """
    Return all tweets containing a given keyword.

    Usage: /search_tweets?keyword=<text>
    Example: /search_tweets?keyword=NASA

    Keyword match is case-insensitive and looks into the 'text' field.
    """
    keyword = request.args.get("keyword", "").strip().lower()
    if not keyword:
        return jsonify({"error": "Please provide a 'keyword' parameter"}), 400

    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # Check each tweet for keyword presence in the text
    results = []
    for t in tweets:
        text = t.get("text", "")
        if keyword in text.lower():
            results.append(t)

    if not results:
        return jsonify({"message": f"No tweets found containing '{keyword}'"}), 404

    return jsonify(results), 200

@app.route('/get_top_users_by_likes', methods=['GET'])
def get_top_users_by_likes():
    """
    Return the top 10 users ranked by total likes on their tweets.

    Likes are accumulated per user and sorted in descending order.
    Output format:
      [ { user: <username>, total_likes: <int> }, ... ]
    """
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    user_likes = {}
    for t in tweets:
        user = t.get("user", "unknown")
        likes_str = t.get("likes", "0")  # likes field is stored as string
        try:
            likes = int(likes_str)
        except:
            likes = 0
        user_likes[user] = user_likes.get(user, 0) + likes

    # Sort users by total likes (descending) and return top 10
    sorted_users = sorted(user_likes.items(), key=lambda x: x[1], reverse=True)
    top_10 = sorted_users[:10]

    result = [{"user": user, "total_likes": likes} for user, likes in top_10]
    return jsonify(result), 200

@app.route('/get_top_tweets_by_retweets', methods=['GET'])
def get_top_tweets_by_retweets():
    """
    Return the top 10 tweets sorted by number of retweets.

    Parses retweet counts (stored as strings) and sorts descending.
    Output is a list of tweet objects.
    """
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # Convert retweets from string → int safely
    for t in tweets:
        retweets_str = t.get("retweets", "0")
        try:
            t["retweets_int"] = int(retweets_str)
        except:
            t["retweets_int"] = 0

    # Sort tweets by retweet count descending
    sorted_tweets = sorted(tweets, key=lambda x: x["retweets_int"], reverse=True)
    top_10 = sorted_tweets[:10]

    # Remove temp field before returning
    for t in top_10:
        t.pop("retweets_int", None)

    return jsonify(top_10), 200

# ---------------- RUN THE APP ----------------

if __name__ == "__main__":
    app.run(port=5001, debug=True)
