import os
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId

# ================================
# Environment & MongoDB Connection
# ================================

# Load environment variables from .env (for DB URI, DB name, etc.)
load_dotenv()

# Read MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")

# Initialize PyMongo client and get database and collection handles
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
journal_collection = db['journals']

# ============================
# Flask Blueprint Setup
# ============================

# Create a Flask Blueprint for journal-related routes
journal_bp = Blueprint("journal", __name__)
CORS(journal_bp)  # Enable CORS for all endpoints in this blueprint

# ============================
# Journal Overview Route
# ============================
@journal_bp.route("/data", methods=["POST"])
@jwt_required()
def journal():
    """
    Returns user's summary journal stats and account balance.
    JWT is required for user authentication.
    """
    try:
        # 1. Extract user ID from JWT token
        user_id = get_jwt_identity()

        # 2. Look up the user by _id in users collection
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # 3. Fetch user's current balance
        user_balance = user.get("user_current_balance", 0.0)

        # 4. Get the user's journal data by User_Id (stored as string)
        journal_data = journal_collection.find_one({"User_Id": str(user_id)})

        # 5. If journal exists, format and return response
        if journal_data:
            response = {
                "success": True,
                "message": "Journal data fetched successfully",
                "user": {
                    "user_id": str(user_id),
                    "current_balance": user_balance
                },
                "journal": {
                    "total_signals": journal_data.get("Total_Signals", 0),
                    "signals_closed_in_profit": journal_data.get("Signals_Closed_in_Profit", 0),
                    "signals_closed_in_loss": journal_data.get("Signals_Closed_in_Loss", 0),
                    "current_running_signals": journal_data.get("Current_Running_Signals", 0),
                    "average_profit_usdt": journal_data.get("Avg_Profit_USDT", 0.0),
                    "average_loss_usdt": journal_data.get("Avg_Loss_USDT", 0.0)
                }
            }
            return jsonify(response), 200
        else:
            # No journal found; respond with user info but no journal data
            return jsonify({
                "success": False,
                "message": "No journal data found for the user",
                "user": {
                    "user_id": str(user_id),
                    "current_balance": user_balance
                }
            }), 404

    except Exception as e:
        # Handle any unexpected errors (DB issues, etc.)
        return jsonify({"success": False, "message": str(e)}), 500

# ============================
# Route: Open Trades for User
# ============================
@journal_bp.route("/opentrades", methods=["POST"])
@jwt_required()
def opentrades():
    """
    Returns all OPEN trades for the current user.
    JWT required. Looks up user's specific trade collection (user_{user_id}).
    """
    try:
        # 1. Get user ID from JWT token
        user_id = get_jwt_identity()

        # 2. Find user by _id
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # 3. Collection name for user's trades
        user_trade_collection = db[f"user_{user_id}"]

        # 4. Find all trades where status is OPEN
        open_trades_cursor = user_trade_collection.find({"status": "OPEN"})
        open_trades = []
        for trade in open_trades_cursor:
            # Convert ObjectId to string for JSON serialization
            trade["_id"] = str(trade["_id"])
            open_trades.append(trade)

        # 5. Build and return response
        response = {
            "success": True,
            "message": "Open trades fetched successfully",
            "user": {
                "user_id": str(user_id),
                "email": user.get("email")
            },
            "open_trades": open_trades
        }
        return jsonify(response), 200

    except Exception as e:
        # Generic error handling for any issue
        return jsonify({"success": False, "message": str(e)}), 500

# ============================
# Route: Closed Trades for User
# ============================
@journal_bp.route("/closetrades", methods=["POST"])
@jwt_required()
def closetrades():
    """
    Returns all CLOSED trades (status 'TP' or 'SL') for the current user, sorted by exit_time descending.
    JWT required. Uses user's individual trades collection.
    """
    try:
        # 1. Get user ID from JWT token
        user_id = get_jwt_identity()

        # 2. Find user document
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # 3. Access user-specific trades collection
        user_trade_collection = db[f"user_{user_id}"]

        # 4. Find all trades where status is 'TP' (take profit) or 'SL' (stop loss), sort by exit_time descending
        closed_trades_cursor = user_trade_collection.find(
            {"status": {"$in": ["TP", "SL"]}}
        ).sort("exit_time", -1)

        closed_trades = []
        for trade in closed_trades_cursor:
            trade["_id"] = str(trade["_id"])
            closed_trades.append(trade)

        # 5. Build and return the response
        response = {
            "success": True,
            "message": "Closed trades fetched successfully",
            "user": {
                "user_id": str(user_id),
                "email": user.get("email")
            },
            "closed_trades": closed_trades
        }

        return jsonify(response), 200

    except Exception as e:
        # Handle any database or logic errors
        return jsonify({"success": False, "message": str(e)}), 500

# ============================
# Route: Get Current Balance
# ============================
@journal_bp.route("/currentbalance", methods=["POST"])
@jwt_required()
def currentbalance():
    """
    Returns the user's current balance and the UI color to display (red if below allocated, else green).
    JWT required.
    """
    try:
        # 1. Get user ID from JWT
        user_id = get_jwt_identity()

        # 2. Find user document
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # 3. Retrieve balance and allocated balance
        balance = user.get("user_current_balance", 0)
        balance_allocated_to_bots = user.get("balance_allocated_to_bots", 0)
        
        # 4. Choose color based on balance vs allocated
        if balance < balance_allocated_to_bots:
            color = "red"
        else:
            color = "green"
        
        # 5. Return balance and color for UI
        return jsonify({
            "success": True,
            "user_current_balance": balance,
            "color": color
        }), 200

    except Exception as e:
        # Return error message for any issue
        return jsonify({"success": False, "message": str(e)}), 500
