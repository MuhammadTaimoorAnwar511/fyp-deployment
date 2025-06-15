from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import CORS
from bson.objectid import ObjectId
from app import mongo

# Define a Flask Blueprint for profile-related routes
profile_bp = Blueprint("profile", __name__)
CORS(profile_bp)  # Enable CORS for cross-origin access

# ------------------------------------------------------------
# Route: Get authenticated user's profile details
# ------------------------------------------------------------
@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    """
    Returns the profile information of the currently authenticated user.
    Requires JWT token for authentication.
    Excludes the user's password from the returned data.
    """
    user_id = get_jwt_identity()  # Get user ID from JWT token

    # Convert the string user ID into a MongoDB ObjectId for querying
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {"password": False})  # Exclude password

    # If no user found, return 404
    if not user:
        return jsonify({"message": "User not found"}), 404

    # Convert MongoDB ObjectId to string before sending as JSON
    user["_id"] = str(user["_id"])

    # Return user profile data
    return jsonify(user), 200
