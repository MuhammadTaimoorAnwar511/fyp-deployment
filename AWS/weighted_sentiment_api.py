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

def parse_timestamp(ts_str):
    """
    Parse an ISO format timestamp string and return an offset-naive datetime object.
    """
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.replace(tzinfo=None)
    except Exception:
        return None

def load_tweets():
    """
    Load tweets from the JSON file. If it doesn’t exist or fails to parse,
    return an empty list.
    """
    if not os.path.exists(TWEETS_FILE):
        return []
    with open(TWEETS_FILE, "r", encoding="utf-8") as f:
        try:
            tweets = json.load(f)
        except Exception:
            tweets = []
    return tweets

# --------------- ORIGINAL SENTIMENT-RELATED FUNCTIONS ---------------

def compute_sentiment(tweets):
    """
    Sort tweets by timestamp, then weight them linearly from earliest to latest.
    Returns a dict with sentiment metrics, or None if tweets is empty.
    """
    if not tweets:
        return None

    try:
        sorted_tweets = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception as e:
        return {"error": f"Error parsing timestamps: {e}"}

    start = parse_timestamp(sorted_tweets[0]['timestamp'])
    end = parse_timestamp(sorted_tweets[-1]['timestamp'])
    total_seconds = (end - start).total_seconds() if start and end else 0

    weighted_counts = {"positive": 0, "neutral": 0, "negative": 0}
    overall_weighted_score = 0.0
    sentiment_value_map = {"positive": 1, "neutral": 0, "negative": -1}

    for tweet in sorted_tweets:
        tweet_time = parse_timestamp(tweet.get('timestamp'))
        if tweet_time is None:
            continue
        # Weight is fraction of time from earliest to this tweet
        weight = ((tweet_time - start).total_seconds() / total_seconds) if total_seconds > 0 else 1
        sentiment = tweet.get("sentiment", "neutral")
        prob = tweet.get("sentiment_probability", 0)

        weighted_counts[sentiment] += weight
        overall_weighted_score += sentiment_value_map.get(sentiment, 0) * prob * weight

    n = len(sorted_tweets)
    if n > 1:
        # Simple "theoretical min/max" approach for normalizing to 0..100
        min_possible = - (n - 1) / 2.0
        max_possible = (n - 1) / 2.0
        normalized_score = ((overall_weighted_score - min_possible) / (max_possible - min_possible)) * 100
    else:
        # If only one tweet, treat it as neutral 50
        normalized_score = 50

    return {
        "start": start.isoformat() if start else None,
        "end": end.isoformat() if end else None,
        "total_tweets": n,
        "weighted_sentiment_counts": weighted_counts,
        "overall_weighted_sentiment_score": overall_weighted_score,
        "normalized_overall_weighted_sentiment_score": normalized_score
    }

def compute_time_decay_sentiment_up_to(tweets_sorted, cutoff_time):
    """
    Compute a time-decayed sentiment for all tweets up to (and including) `cutoff_time`.
    The newest tweet in that range has weight near 1, the oldest near 0.
    Returns None if there are no tweets in the range.
    """
    relevant = [t for t in tweets_sorted if parse_timestamp(t['timestamp']) and parse_timestamp(t['timestamp']) <= cutoff_time]
    if not relevant:
        return None

    relevant_sorted = sorted(relevant, key=lambda t: parse_timestamp(t['timestamp']))
    earliest = parse_timestamp(relevant_sorted[0]['timestamp'])
    total_seconds = (cutoff_time - earliest).total_seconds() if earliest else 0
    if total_seconds <= 0:
        return compute_sentiment(relevant_sorted)

    sentiment_value_map = {"positive": 1, "neutral": 0, "negative": -1}
    weighted_counts = {"positive": 0, "neutral": 0, "negative": 0}
    overall_weighted_score = 0.0

    for tw in relevant_sorted:
        tw_time = parse_timestamp(tw['timestamp'])
        if tw_time is None:
            continue
        fraction_of_range = (tw_time - earliest).total_seconds() / total_seconds

        sentiment = tw.get("sentiment", "neutral")
        prob = tw.get("sentiment_probability", 0)
        weighted_counts[sentiment] += fraction_of_range
        overall_weighted_score += sentiment_value_map.get(sentiment, 0) * prob * fraction_of_range

    n = len(relevant_sorted)
    if n > 1:
        min_possible = - (n - 1) / 2.0
        max_possible = (n - 1) / 2.0
        normalized_score = ((overall_weighted_score - min_possible) / (max_possible - min_possible)) * 100
    else:
        normalized_score = 50

    return {
        "start": earliest.isoformat() if earliest else None,
        "end": cutoff_time.isoformat(),
        "total_tweets": n,
        "weighted_sentiment_counts": weighted_counts,
        "overall_weighted_sentiment_score": overall_weighted_score,
        "normalized_overall_weighted_sentiment_score": normalized_score
    }

# ---------------- FIXED RANGE ENDPOINTS ----------------

@app.route('/get_weighted_sentiment_all', methods=['GET'])
def get_weighted_sentiment_all():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404
    result = compute_sentiment(tweets)
    if not result or "error" in result:
        return jsonify(result), 500
    return jsonify(result), 200

@app.route('/get_sentiment_today', methods=['GET'])
def get_sentiment_today():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    today = datetime.now().date()
    filtered = [t for t in tweets if parse_timestamp(t['timestamp']) and parse_timestamp(t['timestamp']).date() == today]
    if not filtered:
        return jsonify({"error": "No tweets for today"}), 404

    result = compute_sentiment(filtered)
    return jsonify(result), 200

@app.route('/get_sentiment_week', methods=['GET'])
def get_sentiment_week():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    now = datetime.now()
    one_week_ago = now - timedelta(days=7)
    filtered = [t for t in tweets if one_week_ago <= parse_timestamp(t['timestamp']) <= now]
    if not filtered:
        return jsonify({"error": "No tweets in the past week"}), 404

    result = compute_sentiment(filtered)
    return jsonify(result), 200

@app.route('/get_sentiment_month', methods=['GET'])
def get_sentiment_month():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    now = datetime.now()
    one_month_ago = now - timedelta(days=30)
    filtered = [t for t in tweets if one_month_ago <= parse_timestamp(t['timestamp']) <= now]
    if not filtered:
        return jsonify({"error": "No tweets in the past month"}), 404

    result = compute_sentiment(filtered)
    return jsonify(result), 200

@app.route('/get_sentiment_range', methods=['GET'])
def get_sentiment_range():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    start_str = request.args.get("start")
    end_str = request.args.get("end")
    if not start_str or not end_str:
        return jsonify({"error": "Please provide both 'start' and 'end' date parameters"}), 400

    start_date = parse_timestamp(start_str)
    end_date = parse_timestamp(end_str)
    if not start_date or not end_date:
        return jsonify({"error": "Error parsing 'start' or 'end' date"}), 400

    filtered = [t for t in tweets if start_date <= parse_timestamp(t['timestamp']) <= end_date]
    if not filtered:
        return jsonify({"error": "No tweets in the specified date range"}), 404

    result = compute_sentiment(filtered)
    return jsonify(result), 200

# ---------------- GROUPED ENDPOINTS FOR COMPARISONS ----------------

@app.route('/get_sentiment_by_day', methods=['GET'])
def get_sentiment_by_day():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    groups = {}
    for tweet in tweets:
        dt = parse_timestamp(tweet['timestamp'])
        if not dt:
            continue
        day_key = dt.strftime("%Y-%m-%d")
        groups.setdefault(day_key, []).append(tweet)

    results = {}
    for day, group in groups.items():
        sentiment = compute_sentiment(group)
        results[day] = sentiment
    return jsonify(results), 200

@app.route('/get_sentiment_by_week', methods=['GET'])
def get_sentiment_by_week():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    groups = {}
    for tweet in tweets:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:
            continue
        iso_year, iso_week, _ = dt.isocalendar()
        week_key = f"{iso_year}-W{iso_week:02d}"
        groups.setdefault(week_key, []).append(tweet)

    results = {}
    for week, group in groups.items():
        sentiment = compute_sentiment(group)
        results[week] = sentiment
    return jsonify(results), 200

@app.route('/get_sentiment_by_month', methods=['GET'])
def get_sentiment_by_month():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    groups = {}
    for tweet in tweets:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:
            continue
        month_key = dt.strftime("%Y-%m")
        groups.setdefault(month_key, []).append(tweet)

    results = {}
    for month, group in groups.items():
        sentiment = compute_sentiment(group)
        results[month] = sentiment
    return jsonify(results), 200

# ---------------- 5-MIN AND HOUR GROUPED ENDPOINTS ----------------

@app.route('/get_sentiment_by_5min', methods=['GET'])
def get_sentiment_by_5min():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    try:
        tweets_sorted = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception:
        tweets_sorted = tweets

    groups = {}
    for tweet in tweets_sorted:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:
            continue
        dt_floor = dt.replace(second=0, microsecond=0)
        minute_bucket = (dt_floor.minute // 5) * 5
        bucket_start = dt_floor.replace(minute=minute_bucket)
        key = bucket_start.isoformat()
        groups.setdefault(key, []).append(tweet)

    def compute_combined_sentiment(current_tweets, historical_tweets):
        default_sentiment = {
            "normalized_overall_weighted_sentiment_score": 50,
            "overall_weighted_sentiment_score": 0,
            "total_tweets": 0
        }
        from_current = compute_sentiment(current_tweets) or default_sentiment
        from_history = compute_sentiment(historical_tweets) if historical_tweets else None

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
            "total_tweets": from_history.get("total_tweets", 0) + from_current.get("total_tweets", 0)
        }

    results = {}
    for bucket_key, bucket_tweets in groups.items():
        bucket_start = parse_timestamp(bucket_key)
        historical_tweets = [t for t in tweets_sorted if parse_timestamp(t['timestamp']) < bucket_start]
        combined_senti = compute_combined_sentiment(bucket_tweets, historical_tweets)
        results[bucket_key] = combined_senti

    return jsonify(results), 200

@app.route('/get_sentiment_by_hour', methods=['GET'])
def get_sentiment_by_hour():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    try:
        tweets_sorted = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception:
        tweets_sorted = tweets

    groups = {}
    for tweet in tweets_sorted:
        dt = parse_timestamp(tweet['timestamp'])
        if dt is None:
            continue
        bucket = dt.replace(minute=0, second=0, microsecond=0)
        key = bucket.isoformat()
        groups.setdefault(key, []).append(tweet)

    def compute_combined_sentiment(current_tweets, historical_tweets):
        default_sentiment = {
            "normalized_overall_weighted_sentiment_score": 50,
            "overall_weighted_sentiment_score": 0,
            "total_tweets": 0
        }
        from_current = compute_sentiment(current_tweets) or default_sentiment
        from_history = compute_sentiment(historical_tweets) if historical_tweets else None

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
            "total_tweets": from_history.get("total_tweets", 0) + from_current.get("total_tweets", 0)
        }

    results = {}
    for bucket_key, bucket_tweets in groups.items():
        bucket_start = parse_timestamp(bucket_key)
        historical_tweets = [t for t in tweets_sorted if parse_timestamp(t['timestamp']) < bucket_start]
        combined_senti = compute_combined_sentiment(bucket_tweets, historical_tweets)
        results[bucket_key] = combined_senti

    return jsonify(results), 200

# ---------------- UPDATED /get_sentiment_iterations ENDPOINT ----------------

@app.route('/get_sentiment_iterations', methods=['GET'])
def get_sentiment_iterations():
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    ts_str = request.args.get("timestamp")
    if not ts_str:
        return jsonify({"error": "Please provide a 'timestamp' parameter in ISO format."}), 400
    target_time = parse_timestamp(ts_str)
    if target_time is None:
        return jsonify({"error": "Error parsing provided timestamp."}), 400

    # Round down to nearest 5 min
    target_time = target_time.replace(second=0, microsecond=0)
    minute_bucket = (target_time.minute // 5) * 5
    target_bucket = target_time.replace(minute=minute_bucket)

    try:
        tweets_sorted = sorted(tweets, key=lambda t: parse_timestamp(t['timestamp']))
    except Exception:
        tweets_sorted = tweets

    iterations = 1000
    results = {}
    for i in range(iterations):
        bucket_end = target_bucket - timedelta(minutes=5 * i)
        decayed_senti = compute_time_decay_sentiment_up_to(tweets_sorted, bucket_end)
        if decayed_senti is None:
            decayed_senti = {
                "start": None,
                "end": bucket_end.isoformat(),
                "total_tweets": 0,
                "weighted_sentiment_counts": {"positive":0,"neutral":0,"negative":0},
                "overall_weighted_sentiment_score": 0,
                "normalized_overall_weighted_sentiment_score": 50
            }
        results[bucket_end.isoformat()] = decayed_senti

    return jsonify(results), 200


# ---------------- NEW DYNAMIC ROUTES FOR historytweets.json FIELDS ----------------

@app.route('/get_tweets_by_user', methods=['GET'])
def get_tweets_by_user():
    """
    Example: /get_tweets_by_user?user=elonmusk
    Returns all tweets for that user in the JSON data.
    """
    username = request.args.get("user")
    if not username:
        return jsonify({"error": "Please provide a 'user' parameter"}), 400

    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    filtered = [t for t in tweets if t.get("user", "").lower() == username.lower()]
    if not filtered:
        return jsonify({"message": f"No tweets found for user '{username}'"}), 404

    return jsonify(filtered), 200

@app.route('/search_tweets', methods=['GET'])
def search_tweets():
    """
    Example: /search_tweets?keyword=NASA
    Returns tweets whose 'text' contains the keyword (case-insensitive).
    """
    keyword = request.args.get("keyword", "").strip().lower()
    if not keyword:
        return jsonify({"error": "Please provide a 'keyword' parameter"}), 400

    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

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
    Returns top 10 users by total likes across all tweets.
    """
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    user_likes = {}
    for t in tweets:
        user = t.get("user", "unknown")
        likes_str = t.get("likes", "0")  # "likes" is a string in your JSON
        try:
            likes = int(likes_str)
        except:
            likes = 0
        user_likes[user] = user_likes.get(user, 0) + likes

    # Sort by total likes desc
    sorted_users = sorted(user_likes.items(), key=lambda x: x[1], reverse=True)
    top_10 = sorted_users[:10]

    # Return as a list of dict
    result = [{"user": user, "total_likes": likes} for user, likes in top_10]
    return jsonify(result), 200

@app.route('/get_top_tweets_by_retweets', methods=['GET'])
def get_top_tweets_by_retweets():
    """
    Returns top 10 tweets by retweets (the highest retweets).
    """
    tweets = load_tweets()
    if not tweets:
        return jsonify({"error": "No tweets available"}), 404

    # Parse retweets as int
    for t in tweets:
        retweets_str = t.get("retweets", "0")
        try:
            t["retweets_int"] = int(retweets_str)
        except:
            t["retweets_int"] = 0

    # Sort by retweets desc
    sorted_tweets = sorted(tweets, key=lambda x: x["retweets_int"], reverse=True)
    top_10 = sorted_tweets[:10]

    # Remove the temporary "retweets_int" field
    for t in top_10:
        t.pop("retweets_int", None)

    return jsonify(top_10), 200


# ---------------- RUN THE APP ----------------

if __name__ == "__main__":
    app.run(port=5001, debug=True)
