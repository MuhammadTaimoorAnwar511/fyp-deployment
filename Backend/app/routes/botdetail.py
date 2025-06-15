from flask import Blueprint, request, jsonify
from flask_cors import CORS
from app import mongo

# Define a Flask Blueprint for bot detail routes
botdetail_bp = Blueprint("botdetail", __name__)
CORS(botdetail_bp)  # Enable CORS for cross-origin access

# ------------------------------------------
# Route to fetch trading bot analysis details
# ------------------------------------------
@botdetail_bp.route("/detail", methods=["GET"])
def getbotdetail():
    """
    Retrieves performance analysis details for a specific trading bot.
    Expected query parameter:
    - botname: The name of the bot (used to identify the collection)

    Returns:
    - Selected performance metrics from the corresponding MongoDB collection
    - 400 error if botname is not provided
    - 404 error if no data found for the given bot
    """

    # Extract the bot name from query parameters
    botname = request.args.get("botname")  
    if not botname:
        return jsonify({"error": "botname parameter is required"}), 400

    # Construct the dynamic MongoDB collection name
    collection_name = f"Analysis_{botname}"  # Prefix with 'Analysis_'
    collection = mongo.db[collection_name]   # Access the specific collection

    # Query the collection for one document and project only required fields
    data = collection.find_one({}, {
        "_id": 0,                         # Exclude MongoDB's default _id field
        "Total Trades": 1,
        "Losing Trades": 1,
        "Winning Trades": 1,
        "Max Losing Streak": 1,
        "Max Winning Streak": 1,
        "Win Rate (%)": 1,
        "ROI (%)": 1
    })  

    # Handle case where no document is found
    if not data:
        return jsonify({"error": f"No data found for {botname}"}), 404

    # Return the retrieved performance data
    return jsonify(data), 200
