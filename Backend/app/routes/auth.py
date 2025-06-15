from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app import bcrypt, mongo
from flask_jwt_extended import create_access_token
from datetime import timedelta
import re

# Define a Flask Blueprint for authentication routes
auth_bp = Blueprint("auth", __name__)
CORS(auth_bp)  # Enable CORS for this blueprint to handle cross-origin requests

# ------------------------------------------
# Utility function to validate password strength
# ------------------------------------------
def is_strong_password(password):
    """
    Validates password against strength rules:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "Password must contain at least one special character"
    return None

# ------------------------------------------
# User signup route
# ------------------------------------------
@auth_bp.route("/signup", methods=["POST"])
def signup():
    """
    Handles user registration:
    - Validates input fields
    - Checks for unique email/username
    - Enforces password strength
    - Stores user and initializes journal
    """
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    country = data.get("country")
    password = data.get("password")

    # Ensure all fields are provided
    if not username or not email or not country or not password:
        return jsonify({"message": "All fields are required"}), 400

    # Check for existing user with same username or email
    if mongo.db.users.find_one({"$or": [{"username": username}, {"email": email}]}):
        return jsonify({"message": "Username or Email already exists"}), 400

    # Validate password strength
    password_error = is_strong_password(password)
    if password_error:
        return jsonify({"message": password_error}), 400

    # Hash the password for secure storage
    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    # Construct user document
    user_data = {
        "username": username,
        "email": email,
        "country": country,
        "password": hashed_password,
        "balance_allocated_to_bots": 0,
        "user_current_balance": 0,
        "exchange": None,
        "api_key": None,
        "secret_key": None,
    }

    # Insert user record and retrieve user ID
    user_result = mongo.db.users.insert_one(user_data)
    user_id = str(user_result.inserted_id)  # Convert MongoDB ObjectId to string

    # Create corresponding journal entry for the new user
    journal_data = {
        "User_Id": user_id,  # String user ID for easy reference
        "Total_Signals": 0,
        "Signals_Closed_in_Profit": 0,
        "Signals_Closed_in_Loss": 0,
        "Current_Running_Signals": 0,
        "Avg_Profit_USDT": 0.0,
        "Avg_Loss_USDT": 0.0
    }
    mongo.db.journals.insert_one(journal_data)

    return jsonify({"message": "User created successfully"}), 201

# ------------------------------------------
# User login route
# ------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Handles user login:
    - Validates email and password
    - Checks credentials against DB
    - Issues JWT access token (valid for 1 day)
    """
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    # Ensure both email and password are provided
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    # Retrieve user by email
    user = mongo.db.users.find_one({"email": email})

    # Validate credentials
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid email or password"}), 401

    # Convert ObjectId to string to use as JWT identity
    user_id_str = str(user["_id"])

    # Generate JWT token with 1-day expiration
    access_token = create_access_token(identity=user_id_str, expires_delta=timedelta(days=1))

    return jsonify({"access_token": access_token}), 200
