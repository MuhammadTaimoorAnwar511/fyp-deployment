def main():
    # Accounts to scrape
    accounts = [
        "elonmusk", "BillGates", "NASA", "CoinDesk"
        # Add others as needed
    ]

    logging.info(f"Loaded accounts: {accounts}")

    # Setup Chrome driver (VISIBLE Chrome)
    chrome_options = Options()
    # Remove headless to show the browser
    # chrome_options.add_argument("--headless")  # REMOVE THIS LINE
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")

    driver = uc.Chrome(options=chrome_options)

    # If cookies exist, use them; otherwise, prompt login
    if not load_cookies(driver, COOKIES_FILE):
        logging.info("Prompting user for login...")
        manual_login_and_save_cookies(driver, COOKIES_FILE)
        logging.info("Login completed and cookies saved.")

    logging.info("Starting daily-by-daily scraping for the past 5 days.")

    try:
        for account in accounts:
            logging.info(f"\n---------- Scraping account: {account} ----------")

            for i in range(5):
                day_start = datetime.utcnow() - timedelta(days=i+1)
                day_end = datetime.utcnow() - timedelta(days=i)

                since_str = day_start.strftime("%Y-%m-%d")
                until_str = day_end.strftime("%Y-%m-%d")

                daily_tweets = scrape_tweets_advanced(driver, account, since_str, until_str, max_tweets=20)

                tweets_db.extend(daily_tweets)
                append_new_tweets(daily_tweets, HISTORY_TWEETS_FILE)

                logging.info(f"Successfully scraped {account} for {since_str} to {until_str}")

    except Exception as e:
        logging.error(f"Unexpected error during scraping: {e}", exc_info=True)
    finally:
        driver.quit()
