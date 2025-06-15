import os
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import hmac
import hashlib
import base64
from datetime import datetime, UTC
from urllib.parse import urljoin
from flask_cors import CORS
from app import mongo
from bson.objectid import ObjectId
import time
from bson import ObjectId

# ===============================
# Load environment variables
# ===============================
# Load .env file (API keys, endpoints, secrets, etc.)
load_dotenv()

# Read Bybit API endpoint and resource URIs from environment variables
BASE_URL = os.getenv("BASE_URL")
WALLETENDPOINT = os.getenv("WALLETENDPOINT")
TIME_ENDPOINT = os.getenv("TIME_ENDPOINT")

# ===============================
# Blueprint and CORS Setup
# ===============================
# Create a Flask Blueprint for exchange-related endpoints
exchange_bp = Blueprint('exchange', __name__)
# Enable CORS for all routes in this blueprint (allow cross-origin requests)
CORS(exchange_bp)

# ===============================
# Utility Function: Get Server Timestamp
# ===============================
def get_server_timestamp():
    """
    Get the current server timestamp from Bybit API, in milliseconds.
    Falls back to local system time in case of error.
    This is important for request signature validity to avoid time drift issues.
    """
    try:
        response = requests.get(f"{BASE_URL}{TIME_ENDPOINT}")
        if response.status_code == 200:
            data = response.json()
            # Bybit returns time in nanoseconds; convert to milliseconds
            return int(data["result"]["timeNano"]) // 1_000_000
    except Exception as e:
        print(f"Error fetching server time: {e}")
    # If any error, use local system time (milliseconds)
    return int(time.time() * 1000)

# ===============================
# Utility Function: Get USDT Balance
# ===============================
def get_usdt_balance(api_key, api_secret):
    """
    Call the Bybit API to get the user's USDT wallet balance.
    Uses HMAC SHA256 signature for authentication.
    Returns the wallet balance as float, or -1 if failed/not found.
    """
    # Only unified account type is currently supported
    params = {"accountType": "UNIFIED"}

    # Always use Bybit server time for signature
    timestamp = str(get_server_timestamp())
    recv_window = "10000"

    # Prepare sorted query string for signing (alphabetical order)
    query_string = '&'.join(f"{k}={v}" for k, v in sorted(params.items()))

    # Signature format required by Bybit API
    signature_payload = f"{timestamp}{api_key}{recv_window}{query_string}"

    # Calculate HMAC SHA256 signature using API secret
    signature = hmac.new(
        api_secret.encode("utf-8"),
        signature_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    # Compose HTTP headers for Bybit API authentication
    headers = {
        "X-BAPI-API-KEY": api_key,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recv_window,
        "X-BAPI-SIGN": signature
    }

    # Make the authenticated GET request to Bybit
    response = requests.get(f"{BASE_URL}{WALLETENDPOINT}", params=params, headers=headers)

    # Parse the JSON response for USDT balance
    if response.status_code == 200:
        data = response.json()
        # Check result structure and find USDT balance if present
        if 'result' in data and 'list' in data['result']:
            for account in data['result']['list']:
                for coin in account.get('coin', []):
                    if coin['coin'] == 'USDT':
                        # Return USDT wallet balance as float
                        return float(coin['walletBalance'])
    # Return -1 if USDT not found or on any error
    return -1

# ===============================
# Route: Test Connection (POST)
# ===============================
@exchange_bp.route('/TestConnection', methods=['POST'])
@jwt_required()
def test_connection():
    """
    Tests the user's Bybit API key/secret and returns USDT balance if valid.
    - Requires JWT authentication.
    - Returns error for invalid credentials or missing keys.
    """
    # Get current user from JWT token
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

    # If user not found, forbid access
    if not user:
        return jsonify({"success": False, "error": "Unauthorized user"}), 403

    # Get API credentials from request body
    data = request.get_json()
    api_key = data.get("api_key")
    api_secret = data.get("api_secret")

    # Require both API key and secret
    if not api_key or not api_secret:
        return jsonify({"success": False, "error": "API key and secret are required"}), 400

    # Call Bybit API to validate credentials and get balance
    usdt_balance = get_usdt_balance(api_key, api_secret)

    # If failed, report invalid credentials
    if usdt_balance == -1:
        return jsonify({"success": False, "error": "Invalid API key or secret"}), 401

    # If successful, return balance
    return jsonify({"success": True, "usdt_balance": usdt_balance})

# ===============================
# Route: Save Connection (PUT)
# ===============================
@exchange_bp.route("/SaveConnection", methods=["PUT"])
@jwt_required()
def update_exchange():
    """
    Saves the user's Bybit exchange connection after verifying credentials and non-zero balance.
    - Updates the user's MongoDB record with exchange, api_key, secret_key.
    - Fails on invalid keys or zero balance.
    """
    # Get current user from JWT token
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

    # Fail if user not found
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.json

    # Read required fields from request
    api_key = data.get("apiKey")
    api_secret = data.get("apiSecret")
    selected_exchange = data.get("selectedExchange")

    # Check for required fields
    if not selected_exchange:
        return jsonify({"success": False, "message": "Exchange name is required"}), 400
    if not api_key:
        return jsonify({"success": False, "message": "API key is missing"}), 400
    if not api_secret:
        return jsonify({"success": False, "message": "API secret is missing"}), 400

    # Validate API credentials by fetching balance
    usdt_balance = get_usdt_balance(api_key, api_secret)

    # Fail if credentials are invalid
    if usdt_balance == -1:
        return jsonify({
            "success": False,
            "message": "Invalid API key or secret. Please check your credentials and try again."
        }), 401

    # Warn if balance is zero (but credentials are valid)
    if usdt_balance == 0:
        return jsonify({
            "success": False,
            "message": "Valid API credentials, but your USDT balance is zero."
        }), 200

    # Update user document in MongoDB
    update_data = {
        "exchange": selected_exchange,
        "api_key": api_key,
        "secret_key": api_secret
    }
    mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    # Return confirmation and current balance
    return jsonify({
        "success": True,
        "message": f"Exchange '{selected_exchange}' connected successfully!",
        "usdt_balance": usdt_balance
    }), 200

# ===============================
# Route: Delete Connection (DELETE)
# ===============================
@exchange_bp.route('/DeleteConnection', methods=['DELETE'])
@jwt_required()
def delete_connection():
    """
    Deletes the user's Bybit API credentials from the database.
    - Prevents deletion if the user is subscribed to any bots (must unsubscribe first).
    - Clears exchange, api_key, and secret_key fields.
    """
    try:
        # Get user from JWT
        user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

        if not user:
            return jsonify({"message": "User not found"}), 404

        user_id_str = str(user["_id"])  # String form for subscription checks

        # Check if user has active subscriptions to bots
        active_subscriptions = list(mongo.db.subscriptions.find({"user_id": user_id_str}))
        if active_subscriptions:
            # List all bots user is subscribed to
            subscribed_bots = [sub.get("bot_name", "Unknown") for sub in active_subscriptions]
            return jsonify({
                "error": "Unsubscribe from the following bots first.",
                "subscribed_bots": subscribed_bots
            }), 400

        # Remove exchange connection info from user record
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "exchange": None,
                "api_key": None,
                "secret_key": None
            }}
        )

        # Success response
        return jsonify({"message": "Exchange connection deleted successfully"}), 200

    except Exception as e:
        # Catch-all for unexpected errors (e.g., DB issues)
        return jsonify({"error": str(e)}), 500
