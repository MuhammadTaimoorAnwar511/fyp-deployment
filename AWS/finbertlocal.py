import json
import os
import time
import logging
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchElementException

# New imports for FinBERT sentiment analysis
import torch
import scipy
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(levelname)s] %(asctime)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Filenames
COOKIES_FILE = "twitter_cookies.json"
TWEETS_FILE = "tweets.json"

# Local model folder path
local_model_path = "./finbert_local"

# Load FinBERT model and tokenizer from local folder if available; otherwise, download and save
if os.path.exists(local_model_path):
    logging.info(f"Loading FinBERT model from local folder: {local_model_path}")
    finbert_tokenizer = AutoTokenizer.from_pretrained(local_model_path)
    finbert_model = AutoModelForSequenceClassification.from_pretrained(local_model_path)
else:
    logging.info("Local FinBERT model not found. Downloading from Hugging Face ...")
    finbert_tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
    finbert_model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
    logging.info(f"Saving downloaded FinBERT model to local folder: {local_model_path}")
    os.makedirs(local_model_path, exist_ok=True)
    finbert_tokenizer.save_pretrained(local_model_path)
    finbert_model.save_pretrained(local_model_path)

# Initialize Flask app
app = Flask(__name__)

# In-memory tweets store (populated if scraping runs)
tweets_db = []

def predict_sentiment(text):
    """Predict sentiment using FinBERT."""
    tokenizer_kwargs = {"padding": True, "truncation": True, "max_length": 512}
    with torch.no_grad():
        inputs = finbert_tokenizer(text, return_tensors="pt", **tokenizer_kwargs)
        logits = finbert_model(**inputs).logits
        probabilities = scipy.special.softmax(logits.numpy().squeeze())
        scores = { label: prob for label, prob in zip(finbert_model.config.id2label.values(), probabilities) }
    sentiment = max(scores, key=scores.get)
    probability = max(scores.values())
    logging.debug(f"Predicted sentiment for text: '{text[:30]}...' -> {sentiment} ({probability:.2f})")
    return sentiment, float(probability)

def load_cookies(driver, cookie_file=COOKIES_FILE):
    """Load cookies from a file and add to the driver."""
    if not os.path.exists(cookie_file):
        logging.info("No cookies found; manual login required.")
        return False
    with open(cookie_file, "r", encoding="utf-8") as f:
        cookies = json.load(f)
    driver.get("https://x.com/")
    time.sleep(3)
    for cookie in cookies:
        cookie["domain"] = ".x.com"
        try:
            driver.add_cookie(cookie)
        except Exception as e:
            logging.warning(f"Failed to add cookie: {e}")
    driver.refresh()
    time.sleep(5)
    logging.info("Cookies loaded and session restored.")
    return True

def save_cookies(driver, cookie_file=COOKIES_FILE):
    """Save current driver cookies to a file."""
    cookies = driver.get_cookies()
    with open(cookie_file, "w", encoding="utf-8") as f:
        json.dump(cookies, f, indent=2)
    logging.info(f"Cookies saved to {cookie_file}.")

def manual_login_and_save_cookies(driver, cookie_file=COOKIES_FILE):
    """Prompt user for manual login and then save cookies."""
    logging.info("Opening Twitter for manual login...")
    driver.get("https://x.com/login")
    time.sleep(5)
    input("Log in, then press ENTER to continue...")
    save_cookies(driver, cookie_file)

def scrape_latest_tweets(driver, account, max_tweets=5):
    """
    Scrape latest tweets from an account and calculate sentiment.
    Returns a list of tweet dictionaries.
    """
    url = f"https://x.com/search?q=from%3A{account}&f=live"
    logging.info(f"Scraping URL: {url}")
    driver.get(url)
    time.sleep(5)  # Adjust if needed

    tweets_data = []
    try:
        tweet_elements = driver.find_elements(By.CSS_SELECTOR, "article[data-testid='tweet']")
        logging.debug(f"Found {len(tweet_elements)} tweets for {account}")
        for elem in tweet_elements[:max_tweets]:
            try:
                tweet_text = elem.find_element(By.CSS_SELECTOR, "div[data-testid='tweetText']").text
            except NoSuchElementException:
                tweet_text = ""
            try:
                tweet_id = elem.get_attribute("data-tweet-id")
            except NoSuchElementException:
                tweet_id = "N/A"
            try:
                likes = elem.find_element(By.CSS_SELECTOR, "div[data-testid='like']").text
            except NoSuchElementException:
                likes = "0"
            try:
                retweets = elem.find_element(By.CSS_SELECTOR, "div[data-testid='retweet']").text
            except NoSuchElementException:
                retweets = "0"
            try:
                comments = elem.find_element(By.CSS_SELECTOR, "div[data-testid='reply']").text
            except NoSuchElementException:
                comments = "0"

            sentiment, sentiment_probability = predict_sentiment(tweet_text)
            tweets_data.append({
                "user": account,
                "text": tweet_text,
                "tweet_id": tweet_id,
                "likes": likes,
                "retweets": retweets,
                "comments": comments,
                "timestamp": datetime.utcnow().isoformat(),
                "sentiment": sentiment,
                "sentiment_probability": sentiment_probability
            })
        logging.info(f"Scraped {len(tweets_data)} tweets for account: {account}")
    except Exception as e:
        logging.error(f"Error scraping tweets for {account}: {e}")
    return tweets_data

def append_new_tweets(new_tweets, json_file=TWEETS_FILE):
    """Append new tweets to the stored tweets JSON file."""
    if os.path.exists(json_file):
        with open(json_file, "r", encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []
    # Use (user, text) as unique key
    existing_set = {(t["user"], t["text"]) for t in existing if "user" in t and "text" in t}
    added = [nt for nt in new_tweets if (nt["user"], nt["text"]) not in existing_set]
    if added:
        existing.extend(added)
        logging.info(f"Added {len(added)} new tweets.")
    else:
        logging.info("No new tweets to add.")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)

# ----------------- API Endpoints -----------------

@app.route('/get_recent_tweets', methods=['GET'])
def get_recent_tweets():
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    recent = [t for t in tweets_db if datetime.fromisoformat(t["timestamp"]) > cutoff]
    return jsonify(recent), 200

@app.route('/get_sentiments', methods=['GET'])
def get_sentiments():
    counts = {}
    for t in tweets_db:
        counts[t.get("sentiment", "unknown")] = counts.get(t.get("sentiment", "unknown"), 0) + 1
    return jsonify(counts), 200

def get_time_range_from_request():
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    try:
        start = datetime.fromisoformat(start_str) if start_str else datetime.utcnow() - timedelta(days=7)
        end = datetime.fromisoformat(end_str) if end_str else datetime.utcnow()
    except Exception:
        end = datetime.utcnow()
        start = end - timedelta(days=7)
    return start, end

@app.route('/get_equal_sentiment', methods=['GET'])
def get_equal_sentiment():
    start, end = get_time_range_from_request()
    filtered = [t for t in tweets_db if start <= datetime.fromisoformat(t["timestamp"]) <= end]
    counts = {}
    for t in filtered:
        counts[t.get("sentiment", "unknown")] = counts.get(t.get("sentiment", "unknown"), 0) + 1
    return jsonify({
        "start": start.isoformat(),
        "end": end.isoformat(),
        "total_tweets": len(filtered),
        "sentiment_counts": counts
    }), 200

@app.route('/get_weighted_sentiment', methods=['GET'])
def get_weighted_sentiment():
    start, end = get_time_range_from_request()
    total_sec = (end - start).total_seconds()
    filtered = [t for t in tweets_db if start <= datetime.fromisoformat(t["timestamp"]) <= end]
    weighted = {"positive": 0, "neutral": 0, "negative": 0}
    overall_score = 0.0
    total_weight = 0.0
    sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
    for t in filtered:
        t_time = datetime.fromisoformat(t["timestamp"])
        weight = ((t_time - start).total_seconds() / total_sec) if total_sec > 0 else 1
        weighted[t.get("sentiment", "neutral")] += weight
        overall_score += sentiment_map.get(t.get("sentiment", "neutral"), 0) * t.get("sentiment_probability", 0) * weight
        total_weight += weight
    avg_score = overall_score / total_weight if total_weight > 0 else 0
    return jsonify({
        "start": start.isoformat(),
        "end": end.isoformat(),
        "total_tweets": len(filtered),
        "weighted_sentiment_counts": weighted,
        "overall_weighted_sentiment_score": overall_score,
        "average_weighted_sentiment_score": avg_score
    }), 200

@app.route('/get_all_sentiment_scores', methods=['GET'])
def get_all_sentiment_scores():
    sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
    scores = []
    for t in tweets_db:
        val = sentiment_map.get(t.get("sentiment", "neutral"), 0)
        comp = val * t.get("sentiment_probability", 0)
        scores.append({
            "tweet_id": t.get("tweet_id"),
            "timestamp": t.get("timestamp"),
            "sentiment": t.get("sentiment"),
            "sentiment_probability": t.get("sentiment_probability"),
            "computed_sentiment_score": comp
        })
    return jsonify(scores), 200

@app.route('/get_sentiments_timeframe/<timeframe>', methods=['GET'])
def get_sentiments_timeframe(timeframe):
    now = datetime.utcnow()
    if timeframe == "today":
        start = datetime(now.year, now.month, now.day)
    elif timeframe == "week":
        start = now - timedelta(days=7)
    elif timeframe == "month":
        start = now - timedelta(days=30)
    else:
        return jsonify({"error": "Unsupported timeframe. Use today, week, or month."}), 400
    filtered = [t for t in tweets_db if start <= datetime.fromisoformat(t["timestamp"]) <= now]
    counts = {}
    for t in filtered:
        counts[t.get("sentiment", "unknown")] = counts.get(t.get("sentiment", "unknown"), 0) + 1
    return jsonify({
        "timeframe": timeframe,
        "start": start.isoformat(),
        "end": now.isoformat(),
        "total_tweets": len(filtered),
        "sentiment_counts": counts
    }), 200

# New endpoint: Weighted sentiment from stored tweets.json
@app.route('/get_weighted_sentiment_all', methods=['GET'])
def get_weighted_sentiment_all():
    try:
        if not os.path.exists(TWEETS_FILE):
            logging.error("tweets.json not found.")
            return jsonify({"error": "No tweets stored"}), 404
        with open(TWEETS_FILE, "r", encoding="utf-8") as f:
            stored = json.load(f)
        if not stored:
            logging.error("tweets.json is empty.")
            return jsonify({"error": "No tweets available"}), 404
        logging.debug(f"Loaded {len(stored)} tweets from {TWEETS_FILE}")
        # Sort by timestamp
        sorted_tweets = sorted(stored, key=lambda t: datetime.fromisoformat(t["timestamp"]))
        start = datetime.fromisoformat(sorted_tweets[0]["timestamp"])
        end = datetime.fromisoformat(sorted_tweets[-1]["timestamp"])
        total_sec = (end - start).total_seconds()
        weighted = {"positive": 0, "neutral": 0, "negative": 0}
        overall_score = 0.0
        total_weight = 0.0
        sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
        for idx, t in enumerate(sorted_tweets):
            try:
                t_time = datetime.fromisoformat(t["timestamp"])
            except Exception as e:
                logging.error(f"Error parsing timestamp for tweet index {idx}: {t.get('timestamp')}")
                continue
            weight = ((t_time - start).total_seconds() / total_sec) if total_sec > 0 else 1
            s = t.get("sentiment", "neutral")
            p = t.get("sentiment_probability", 0)
            weighted[s] += weight
            overall_score += sentiment_map.get(s, 0) * p * weight
            total_weight += weight
            if idx % 10 == 0:
                logging.debug(f"Processed tweet {idx+1}/{len(sorted_tweets)}")
        avg_score = overall_score / total_weight if total_weight > 0 else 0
        logging.debug("Weighted sentiment calculation complete.")
        return jsonify({
            "start": start.isoformat(),
            "end": end.isoformat(),
            "total_tweets": len(sorted_tweets),
            "weighted_sentiment_counts": weighted,
            "overall_weighted_sentiment_score": overall_score,
            "average_weighted_sentiment_score": avg_score
        }), 200
    except Exception as e:
        logging.error(f"Error in /get_weighted_sentiment_all: {e}", exc_info=True)
        return jsonify({"error": "An error occurred during weighted sentiment calculation."}), 500

# ----------------- Scraping Loop -----------------

def main():
    if not os.path.exists("accounts.json"):
        logging.error("accounts.json not found. Please create it with account names.")
        return
    with open("accounts.json", "r", encoding="utf-8") as f:
        accounts = json.load(f)
    logging.info(f"Loaded accounts: {accounts}")
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    driver = uc.Chrome(options=chrome_options)
    if not load_cookies(driver, COOKIES_FILE):
        manual_login_and_save_cookies(driver, COOKIES_FILE)
    logging.info("Starting scraping loop. Press Ctrl+C to stop.")
    try:
        while True:
            for account in accounts:
                logging.info(f"Scraping tweets for: {account}")
                new_tweets = scrape_latest_tweets(driver, account, max_tweets=5)
                append_new_tweets(new_tweets, TWEETS_FILE)
                tweets_db.extend(new_tweets)
                logging.debug("Sleeping 10 seconds...")
                time.sleep(10)
            logging.info("Cycle complete. Sleeping 5 minutes...")
            time.sleep(5 * 60)
    except KeyboardInterrupt:
        logging.info("Scraping stopped by user (Ctrl+C).")
    except Exception as e:
        logging.error(f"Unexpected error in scraping loop: {e}")
    finally:
        driver.quit()
        logging.info("Driver quit.")

if __name__ == "__main__":
    import threading
    # Start scraping in a daemon thread
    threading.Thread(target=main, daemon=True).start()
    # Run Flask app
    app.run(debug=False, host="0.0.0.0", port=5000)
