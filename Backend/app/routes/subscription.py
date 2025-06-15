import os
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify
from app.models.subscription import Subscription
from bson import ObjectId
from app import mongo
from flask_cors import CORS
from flask import Blueprint,request, jsonify
from urllib.parse import urljoin
from datetime import datetime, UTC
import hmac
import requests
import hashlib
import base64
import time
from flask_jwt_extended import jwt_required, get_jwt_identity

# ===============================
# Load Environment Variables
# ===============================
# Load all values from .env file for API endpoints and keys
load_dotenv()

# Fetch Bybit API endpoints and base URL
BASE_URL = os.getenv("BASE_URL")
WALLETENDPOINT = os.getenv("WALLETENDPOINT")
TIME_ENDPOINT = os.getenv("TIME_ENDPOINT")

# ===============================
# Blueprint and CORS Setup
# ===============================
# Create a Flask Blueprint for subscription-related endpoints
subscription_bp = Blueprint("subscription", __name__)
CORS(subscription_bp)  # Enable CORS for this blueprint

# ===============================
# Utility Function: Get Server Timestamp
# ===============================
def get_server_timestamp():
    """
    Fetch the correct server timestamp from Bybit to avoid time drift issues.
    If unavailable, fallback to local system time (milliseconds).
    """
    try:
        response = requests.get(f"{BASE_URL}{TIME_ENDPOINT}")
        if response.status_code == 200:
            data = response.json()
            return int(data["result"]["timeNano"]) // 1_000_000  # Convert nano to ms
    except Exception as e:
        print(f"Error fetching server time: {e}")
    return int(time.time() * 1000)  # Fallback to local time

# ===============================
# Utility Function: Get USDT Balance
# ===============================
def get_usdt_balance(api_key, api_secret):
    """
    Fetch only USDT wallet balance from Bybit API for a given API key and secret.
    Returns wallet balance as float if successful, else -1.
    """
    params = {"accountType": "UNIFIED"}
    timestamp = str(get_server_timestamp())
    recv_window = "10000"

    # Create query string in sorted order for signing
    query_string = '&'.join(f"{k}={v}" for k, v in sorted(params.items()))
    signature_payload = f"{timestamp}{api_key}{recv_window}{query_string}"

    # Generate HMAC SHA256 signature required by Bybit
    signature = hmac.new(api_secret.encode("utf-8"), signature_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    headers = {
        "X-BAPI-API-KEY": api_key,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recv_window,
        "X-BAPI-SIGN": signature
    }
    # Make GET request to Bybit wallet endpoint
    response = requests.get(f"{BASE_URL}{WALLETENDPOINT}", params=params, headers=headers)
    # Parse for USDT balance
    if response.status_code == 200:
        data = response.json()
        if 'result' in data and 'list' in data['result']:
            for account in data['result']['list']:
                for coin in account.get('coin', []):
                    if coin['coin'] == 'USDT':
                        return float(coin['walletBalance'])  
    return -1

# ===============================
# API: Test Connection (Public)
# ===============================
@subscription_bp.route("/test_connection", methods=["POST"])
def test_connection():
    """
    Validates provided API key/secret by querying Bybit for USDT balance.
    Returns balance if valid, or error if not.
    """
    data = request.get_json()
    api_key = data.get("api_key")
    api_secret = data.get("api_secret")
    # Require both API key and secret
    if not api_key or not api_secret:
        return jsonify({"success": False, "error": "API key and secret are required"}), 400
    usdt_balance = get_usdt_balance(api_key, api_secret)
    if usdt_balance == -1:
        return jsonify({"success": False, "error": "Invalid API key or secret"}), 401
    return jsonify({"success": True, "usdt_balance": usdt_balance})

# ===============================
# API: Create Subscription
# ===============================
@subscription_bp.route("/create", methods=["POST"])
@jwt_required()
def create_subscription():
    """
    Create a new bot subscription for the user after validating their API keys,
    checking their Bybit USDT balance, and ensuring sufficient funds.
    Updates allocated and current balances accordingly, and creates the subscription.
    """
    user_id = get_jwt_identity()  # Get user _id from JWT token
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    bot_name = data.get("bot_name")
    bot_initial_balance = data.get("bot_initial_balance")

    # Validate bot name and initial balance
    if not bot_name or bot_initial_balance is None:
        return jsonify({"error": "Missing required fields"}), 400

    api_key = user.get("api_key")
    api_secret = user.get("secret_key")

    # Check that user has connected an exchange and provided valid API credentials
    if not all([user.get("exchange"), api_key, api_secret]):
        return jsonify({"error": "User must have exchange, api_key, and secret_key set"}), 400

    # Validate API credentials by fetching USDT balance from Bybit
    usdt_balance = get_usdt_balance(api_key, api_secret)
    if usdt_balance == -1:
        return jsonify({"error": "Invalid API key or secret"}), 401

    # Compute the new total allocated balance after this subscription
    balance_allocated_to_bots = user.get("balance_allocated_to_bots", 0)
    new_balance = balance_allocated_to_bots + bot_initial_balance

    # Ensure user has enough USDT for the new allocation
    if new_balance > usdt_balance:
        additional_required = new_balance - usdt_balance
        return jsonify({
            "error": f"You need additional {additional_required:.2f} USDT to subscribe to {bot_name} "
                     f"because you already allocated {balance_allocated_to_bots:.2f} USDT to bots."
        }), 400

    # Update user's allocated and current balances in DB
    mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"balance_allocated_to_bots": new_balance}})
    new_user_current_balance = user.get("user_current_balance", 0) + bot_initial_balance
    mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"user_current_balance": new_user_current_balance}})

    # Create subscription entry
    symbol = bot_name.replace("_", "/")
    subscription_id = mongo.db.subscriptions.insert_one({
        "bot_name": bot_name,
        "symbol": symbol,
        "user_id": str(user_id),
        "bot_initial_balance": bot_initial_balance,
        "bot_current_balance": bot_initial_balance
    }).inserted_id

    # Respond with details
    return jsonify({
        "message": f"{symbol} Subscription created successfully, USDT balance: {usdt_balance:.2f}",
        "subscription_id": str(subscription_id),
        "symbol": symbol,
        "usdt_balance": usdt_balance,
        "balance_allocated_to_bots": new_balance,
        "user_current_balance": new_user_current_balance
    }), 201

# ===============================
# API: Check Subscription Status
# ===============================
@subscription_bp.route("/status", methods=["POST"])
@jwt_required()
def check_subscription_status():
    """
    Check if the current user is subscribed to a specific bot.
    Returns boolean 'subscribed' field.
    """
    user_id = get_jwt_identity()  # Get user _id from token
    data = request.get_json()
    bot_name = data.get("bot_name")

    if not bot_name:
        return jsonify({"error": "Missing bot_name field"}), 400

    # Query the database using user_id and bot_name
    subscription = mongo.db.subscriptions.find_one({
        "user_id": str(user_id),
        "bot_name": bot_name
    })

    return jsonify({"subscribed": bool(subscription)}), 200

# ===============================
# API: Delete Subscription
# ===============================
@subscription_bp.route("/delete/<user_id>/<bot_name>", methods=["DELETE"])
def delete_subscription(user_id, bot_name):
    """
    Delete a user's subscription to a specific bot.
    Updates user balances, removes all associated OPEN trades, and updates journal stats.
    """
    # Step 1: Find the subscription entry in DB
    subscription = mongo.db.subscriptions.find_one({"user_id": user_id, "bot_name": bot_name})
    if not subscription:
        return jsonify({"error": "No subscription found for this user and bot"}), 404

    bot_initial_balance = subscription.get("bot_initial_balance", 0)

    # Step 2: Find user by _id
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User does not exist"}), 404

    # Step 3: Deduct bot balance from user's allocated and current balances
    new_balance = max(user.get("balance_allocated_to_bots", 0) - bot_initial_balance, 0)
    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"balance_allocated_to_bots": new_balance}}
    )

    new_user_current_balance = max(user.get("user_current_balance", 0) - bot_initial_balance, 0)
    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"user_current_balance": new_user_current_balance}}
    )

    # Step 4: Remove subscription entry from DB
    mongo.db.subscriptions.delete_one({"user_id": user_id, "bot_name": bot_name})

    # Step 5: Remove all OPEN trades for this symbol in user's trade collection
    collection = mongo.db[f"user_{user_id}"]
    symbol = subscription.get("symbol", "").replace("/", "")  
    deleted_result = collection.delete_many({"symbol": symbol, "status": "OPEN"})
    deleted_count = deleted_result.deleted_count

    # Step 6: Update journal stats to subtract deleted trades
    journal = mongo.db.journals.find_one({"User_Id": user_id})
    if journal:
        updated_total_signals = max(journal.get("Total_Signals", 0) - deleted_count, 0)
        updated_running_signals = max(journal.get("Current_Running_Signals", 0) - deleted_count, 0)
        mongo.db.journals.update_one(
            {"User_Id": user_id},
            {"$set": {
                "Total_Signals": updated_total_signals,
                "Current_Running_Signals": updated_running_signals
            }}
        )

    # Respond with a summary
    return jsonify({
        "message": f"{bot_name} Bot Subscription and {deleted_count} associated OPEN trades deleted. Journal stats updated."
    }), 200
