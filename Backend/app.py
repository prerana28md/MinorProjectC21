from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd

from pymongo import MongoClient
from flask_bcrypt import Bcrypt
import os


app = Flask(__name__)
CORS(app,resources={r"/*": {"origins": "*"}})
bcrypt = Bcrypt(app)
# Allow routes to be reached with or without a trailing slash to avoid
# automatic redirects that can turn POSTs into GETs and produce 405 errors
# (keeps behavior consistent without adding endpoints)
app.url_map.strict_slashes = False

# Connect to MongoDB Atlas
# Replace <username>, <password>, and <cluster-url> with your details
from dotenv import load_dotenv
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")

client = MongoClient(mongo_uri)
db = client["tourism_db"]
users_collection = db["users"]


# In-memory user store for demo authentication
users = {}

# Load data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

states_complete_df = pd.read_csv(os.path.join(BASE_DIR, "data", "states_complete.csv"))
cities_df = pd.read_csv(os.path.join(BASE_DIR, "data", "cities.csv"))
risk_df = pd.read_csv(os.path.join(BASE_DIR, "data", "risk_data.csv"))

# ---------------------------------------------
# 🔐 USER AUTHENTICATION (Register / Login)
# ---------------------------------------------
from flask import request, jsonify
from datetime import datetime

@app.route('/register', methods=['GET', 'POST'])
def register():
    # Handle GET request to show example usage
    if request.method == 'GET':
        return jsonify({
            "message": "Use POST with JSON body to register a new user.",
            "example": {
                "username": "new_user",
                "password": "secret",
                "email": "you@example.com",
                "interests": ["Beach"]
            }
        })

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Missing JSON body with username, email, password"}), 400

    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    interests = data.get('interests', [])

    if not username or not password or not email:
        return jsonify({"error": "Username, email and password are required"}), 400

    # Check if username or email exists
    if users_collection.find_one({"$or": [{"username": username}, {"email": email}]}):
        return jsonify({"error": "Username or Email already exists"}), 409

    # Hash password (using bcrypt as in your original)
    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

    # Insert user document including interests and createdAt timestamp
    users_collection.insert_one({
        "username": username,
        "email": email,
        "password": hashed_pw,
        "interests": interests,
        "createdAt": datetime.utcnow()
    })

    return jsonify({"message": "User registered successfully."}), 201

@app.route('/interests', methods=['GET'])
def get_interests():
    # Get unique categories from the actual dataset
    unique_categories = cities_df['category'].dropna().unique().tolist()
    # Sort them for better user experience
    unique_categories.sort()
    return jsonify(unique_categories)


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = users_collection.find_one({"username": username})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({"message": "Login successful", "username": username})


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Tourism Risk Dashboard API"})

# Get or update user interests
@app.route('/user/<username>/interests', methods=['GET', 'PUT', 'POST'])
def user_interests(username):
    # GET: return the user's interests
    if request.method == 'GET':
        user = users_collection.find_one({"username": username}, {"password": 0})
        if not user:
            return jsonify({"error": "User not found"}), 404
        # Ensure interests key exists
        interests = user.get('interests', [])
        return jsonify({"username": username, "interests": interests})

    # PUT/POST: update interests
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Missing JSON body with interests"}), 400

    interests = data.get('interests')
    if interests is None:
        return jsonify({"error": "'interests' key required in JSON body"}), 400

    result = users_collection.update_one(
        {"username": username},
        {"$set": {"interests": interests}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"message": "User interests updated successfully.", "username": username, "interests": interests})

# Get list of states
@app.route('/states', methods=['GET'])
def get_states():
    return jsonify(states_complete_df['state_name'].tolist())

# Get state details
@app.route('/states/<state_name>', methods=['GET'])
def state_details(state_name):
    # Try exact match first
    df = states_complete_df[states_complete_df['state_name'].str.lower() == state_name.lower()]
    
    # If no exact match, try partial match
    if df.empty:
        df = states_complete_df[states_complete_df['state_name'].str.lower().str.contains(state_name.lower(), na=False)]
    
    if df.empty:
        abort(404)
    # Return all state details except tourism trend columns for brevity
    state_data = df.iloc[0].to_dict()
    # Remove tourism-related columns from main details
    for col in list(state_data.keys()):
        if col.startswith('tourism_'):
            del state_data[col]
    return jsonify(state_data)

# Risk data for state
@app.route('/states/<state_name>/risk', methods=['GET'])
def state_risk(state_name):
    df = risk_df[risk_df['state'].str.lower() == state_name.lower()]
    if df.empty:
        abort(404)
    return jsonify(df.iloc[0].to_dict())

# Tourism trends from states_complete.csv based on actual visitor data
@app.route('/states/<state_name>/tourism_trends', methods=['GET'])
def tourism_trends_data(state_name):
    # Try exact match first
    df = states_complete_df[states_complete_df['state_name'].str.lower() == state_name.lower()]
    
    # If no exact match, try partial match
    if df.empty:
        df = states_complete_df[states_complete_df['state_name'].str.lower().str.contains(state_name.lower(), na=False)]
    
    if df.empty:
        abort(404)
    
    # Get visitor columns (visitors_2020, visitors_2021, etc.)
    visitor_cols = [c for c in df.columns if c.startswith('visitors_')]
    trends = {}
    
    for col in visitor_cols:
        year = col.split('_')[1]  # Extract year from column name
        trends[year] = int(df.iloc[0][col]) if pd.notna(df.iloc[0][col]) else 0
    
    return jsonify(trends)

# Cities in a state
@app.route('/states/<state_name>/cities', methods=['GET'])
def state_cities(state_name):
    # Try exact match first
    df = cities_df[cities_df['state_name'].str.lower() == state_name.lower()]
    
    # If no exact match, try partial match
    if df.empty:
        df = cities_df[cities_df['state_name'].str.lower().str.contains(state_name.lower(), na=False)]
    
    if df.empty:
        # Return empty list instead of 404 to avoid breaking frontend
        return jsonify([])
    return jsonify(df.to_dict(orient='records'))

# City details
@app.route('/states/<state_name>/cities/<city_name>', methods=['GET'])
def city_details(state_name, city_name):
    df = cities_df[(cities_df['state_name'].str.lower() == state_name.lower()) &
                   (cities_df['city_name'].str.lower() == city_name.lower())]
    if df.empty:
        abort(404)
    return jsonify(df.iloc[0].to_dict())

# Search places with filters
@app.route('/search_places', methods=['GET'])
def search_places():
    category = request.args.get('category')
    month = request.args.get('month')
    min_rating = float(request.args.get('min_rating', 0))
    max_risk = float(request.args.get('max_risk', 1))
    filtered = cities_df

    if category:
        filtered = filtered[filtered['category'].str.lower() == category.lower()]
    filtered = filtered[filtered['tourist_rating'] >= min_rating]
    filtered = filtered[filtered['risk_index'] <= max_risk]
    if month:
        m = month.lower()
        # Improved month filtering - check both best_time_to_visit and popular_months
        month_mask = (
            filtered['best_time_to_visit'].str.lower().str.contains(m, na=False) |
            filtered['popular_months'].str.lower().str.contains(m, na=False)
        )
        filtered = filtered[month_mask]
    if filtered.empty:
        return jsonify({"message": "No places found matching criteria."})
    return jsonify(filtered.to_dict(orient='records'))

# Basic AI recommendation (rule-based example)
@app.route('/recommend', methods=['GET', 'POST'])
def recommend():
    # -------------------------
    # Case 1: GET method (browser or test)
    # -------------------------
    if request.method == 'GET':
        return jsonify({
            "message": "Use POST with JSON body like:",
            "example": {
                "interests": ["Hill Station", "Beach"],
                "max_risk": 0.5,
                "min_rating": 4.0
            }
        })

    # -------------------------
    # Case 2: POST method (actual AI-based recommendation)
    # -------------------------
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({"error": "Invalid JSON input", "details": str(e)}), 400

    # Extract user preferences
    interests = data.get('interests', [])
    month = data.get('month', '')
    max_risk = float(data.get('max_risk', 1.0))
    min_rating = float(data.get('min_rating', 0))

    # Create copy to filter
    filtered = cities_df.copy()

    # Filter by interests
    if interests:
        interest_set = set(i.lower() for i in interests)
        if 'category' in filtered.columns:
            filtered = filtered[filtered['category'].str.lower().isin(interest_set)]

    # Filter by month if provided
    if month:
        m = month.lower()
        # Check if the selected month is in popular_months or best_time_to_visit
        month_mask = (
            filtered['best_time_to_visit'].str.lower().str.contains(m, na=False) |
            filtered['popular_months'].str.lower().str.contains(m, na=False)
        )
        filtered = filtered[month_mask]

    # Filter by risk and rating
    if 'risk_index' in filtered.columns:
        filtered = filtered[filtered['risk_index'] <= max_risk]
    if 'tourist_rating' in filtered.columns:
        filtered = filtered[filtered['tourist_rating'] >= min_rating]

    # If nothing found
    if filtered.empty:
        return jsonify({"message": "No recommendations found matching your preferences."}), 200

    # Sort results: Highest rating, lowest risk
    filtered = filtered.sort_values(['tourist_rating', 'risk_index'], ascending=[False, True])

    # Convert any numpy datatypes to normal Python types
    results = filtered.head(10).map(lambda x: x.item() if hasattr(x, 'item') else x)

    # Return final recommendations
    return jsonify({
        "total_recommendations": len(results),
        "recommendations": results.to_dict(orient='records')
    })

# Compare two states on selected metrics
@app.route('/compare/states', methods=['GET'])
def compare_states():
    state1 = request.args.get('state1')
    state2 = request.args.get('state2')
    if not state1 or not state2:
        return jsonify({"error": "Please provide state1 and state2 query params."}), 400

    df1 = states_complete_df[states_complete_df['state_name'].str.lower() == state1.lower()]
    df2 = states_complete_df[states_complete_df['state_name'].str.lower() == state2.lower()]
    if df1.empty or df2.empty:
        return jsonify({"error": "One or both states not found."}), 404

    keys = [col for col in df1.columns if col not in ['state_name'] and not col.startswith('tourism_')]
    comparison = {
        key: {
            state1: df1.iloc[0][key].item() if hasattr(df1.iloc[0][key], 'item') else df1.iloc[0][key],
            state2: df2.iloc[0][key].item() if hasattr(df2.iloc[0][key], 'item') else df2.iloc[0][key]
        } for key in keys
    }

    return jsonify(comparison)


# Compare two cities based on risk and rating
@app.route('/compare/cities', methods=['GET'])
def compare_cities():
    state1 = request.args.get('state1')
    city1 = request.args.get('city1')
    state2 = request.args.get('state2')
    city2 = request.args.get('city2')
    if not all([state1, city1, state2, city2]):
        return jsonify({"error": "Please provide state1, city1, state2, city2 query params."}), 400

    c1 = cities_df[(cities_df['state_name'].str.lower() == state1.lower()) &
                   (cities_df['city_name'].str.lower() == city1.lower())]
    c2 = cities_df[(cities_df['state_name'].str.lower() == state2.lower()) &
                   (cities_df['city_name'].str.lower() == city2.lower())]
    if c1.empty or c2.empty:
        return jsonify({"error": "One or both cities not found."}), 404

    keys = ['tourist_rating', 'risk_index', 'category', 'best_time_to_visit']
    comparison = {
        key: {
            f"{city1}, {state1}": c1.iloc[0][key].item() if hasattr(c1.iloc[0][key], 'item') else c1.iloc[0][key],
            f"{city2}, {state2}": c2.iloc[0][key].item() if hasattr(c2.iloc[0][key], 'item') else c2.iloc[0][key]
        } for key in keys
    }

    return jsonify(comparison)


# List all users (safe view)
@app.route('/users', methods=['GET'])
def list_users():
    """Return list of users stored in MongoDB, omitting password fields.

    Note: This endpoint exposes user records and should be protected in
    production (authentication/authorization). For now it is handy for
    development and debugging.
    """
    try:
        users = []
        # Exclude password field from the returned documents
        cursor = users_collection.find({}, {"password": 0})
        for doc in cursor:
            # Convert ObjectId to string for JSON serialization
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            users.append(doc)
        return jsonify(users)
    except Exception as e:
        app.logger.exception('Failed to fetch users')
        return jsonify({"error": "Failed to fetch users", "details": str(e)}), 500


# ---------------------------------------------
# 🌦️ WEATHER FORECAST MODULE (for Cities & States)
# ---------------------------------------------
# ---------------------------------------------
# 🌦️ WEATHER FORECAST MODULE (for Cities & States)
# ---------------------------------------------
# ---------------------------------------------
# 🌦️ WEATHER FORECAST MODULE (for Cities & States)
# ---------------------------------------------
import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Get API key (may be missing during import; check per-request and return helpful errors)
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

def _ensure_api_key():
    """Return (True, key) if API key exists, otherwise (False, message).

    This avoids raising at import time so the app can still run and return
    a helpful error when weather endpoints are called without a key.
    """
    key = WEATHER_API_KEY or os.getenv("OPENWEATHER_API_KEY")
    if not key:
        return False, (
            "OpenWeatherMap API key not configured. "
            "Set the WEATHER_API_KEY (or OPENWEATHER_API_KEY) environment variable. "
            "See https://openweathermap.org/api for details."
        )
    return True, key

# Mapping local/alternative city names to OpenWeatherMap recognized names
city_map = {
    "Mysuru": "Mysore",
    "Bengaluru": "Bangalore",
    "Thiruvananthapuram": "Trivandrum",
    "New Delhi": "Delhi",
    # Add more mappings if needed
}

# Representative city for each state (used for state-level weather)
state_city_map = {
    "Andhra Pradesh": "Vijayawada",
    "Arunachal Pradesh": "Itanagar",
    "Assam": "Guwahati",
    "Bihar": "Patna",
    "Chhattisgarh": "Raipur",
    "Goa": "Panaji",
    "Gujarat": "Ahmedabad",
    "Haryana": "Chandigarh",
    "Himachal Pradesh": "Shimla",
    "Jharkhand": "Ranchi",
    "Karnataka": "Bengaluru",
    "Kerala": "Thiruvananthapuram",
    "Madhya Pradesh": "Bhopal",
    "Maharashtra": "Mumbai",
    "Manipur": "Imphal",
    "Meghalaya": "Shillong",
    "Mizoram": "Aizawl",
    "Nagaland": "Kohima",
    "Odisha": "Bhubaneswar",
    "Punjab": "Amritsar",
    "Rajasthan": "Jaipur",
    "Sikkim": "Gangtok",
    "Tamil Nadu": "Chennai",
    "Telangana": "Hyderabad",
    "Tripura": "Agartala",
    "Uttar Pradesh": "Lucknow",
    "Uttarakhand": "Dehradun",
    "West Bengal": "Kolkata",
    "Delhi": "New Delhi"
}

# ---------------------------------------------
# 🔹 WEATHER FOR A CITY
# ---------------------------------------------
@app.route('/weather/city/<city_name>', methods=['GET'])
def get_city_weather(city_name):
    city_api_name = city_map.get(city_name.title(), city_name.title())
    try:
        ok, key_or_msg = _ensure_api_key()
        if not ok:
            return jsonify({"error": "Missing API key", "message": key_or_msg}), 500

        url = (
            f"http://api.openweathermap.org/data/2.5/weather?q={city_api_name},IN"
            f"&appid={key_or_msg}&units=metric"
        )
        # Simple retry for transient network issues
        try_count = 0
        res = None
        while try_count < 2:
            try:
                res = requests.get(url, timeout=10)
                break
            except requests.exceptions.RequestException as e:
                app.logger.debug('Weather request attempt %s failed: %s', try_count + 1, e)
                try_count += 1
                if try_count >= 2:
                    raise
        data = {}
        try:
            data = res.json()
        except Exception:
            # Non-JSON response
            return jsonify({"error": "Unexpected response from weather provider", "status_code": res.status_code}), 502

        # Handle invalid API key specifically
        if res.status_code == 401:
            # Pass along provider message but avoid exposing sensitive details
            provider_msg = data.get('message', 'Unauthorized')
            return jsonify({
                "error": "Invalid or unauthorized API key for OpenWeatherMap.",
                "provider_message": provider_msg,
                "help": "Verify your WEATHER_API_KEY / OPENWEATHER_API_KEY environment variable. See https://openweathermap.org/faq#error401"
            }), 401

        if res.status_code != 200 or "main" not in data:
            # Log the response body to help debugging (kept in server logs)
            app.logger.debug('OpenWeatherMap failed: status=%s body=%s', res.status_code, data)
            return jsonify({
                "error": "Weather data not found",
                "details": data
            }), 404

        weather = {
            "city": data["name"],
            "temperature": round(data["main"]["temp"], 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "humidity": data["main"]["humidity"],
            "condition": data["weather"][0]["description"].title(),
            "wind_speed": data["wind"]["speed"]
        }
        return jsonify(weather)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------
# 🔹 WEATHER FOR A STATE (based on representative city)
# ---------------------------------------------
@app.route('/weather/state/<state_name>', methods=['GET'])
def get_state_weather(state_name):
    state_title = state_name.title()
    if state_title not in state_city_map:
        return jsonify({"error": "State not found or no representative city available"}), 404

    city_api_name = city_map.get(state_city_map[state_title], state_city_map[state_title])
    try:
        ok, key_or_msg = _ensure_api_key()
        if not ok:
            return jsonify({"error": "Missing API key", "message": key_or_msg}), 500

        url = (
            f"http://api.openweathermap.org/data/2.5/weather?q={city_api_name},IN"
            f"&appid={key_or_msg}&units=metric"
        )
        # Simple retry for transient network issues
        try_count = 0
        res = None
        while try_count < 2:
            try:
                res = requests.get(url, timeout=10)
                break
            except requests.exceptions.RequestException as e:
                app.logger.debug('Weather request attempt %s failed: %s', try_count + 1, e)
                try_count += 1
                if try_count >= 2:
                    raise
        data = {}
        try:
            data = res.json()
        except Exception:
            return jsonify({"error": "Unexpected response from weather provider", "status_code": res.status_code}), 502

        if res.status_code == 401:
            provider_msg = data.get('message', 'Unauthorized')
            return jsonify({
                "error": "Invalid or unauthorized API key for OpenWeatherMap.",
                "provider_message": provider_msg,
                "help": "Verify your WEATHER_API_KEY / OPENWEATHER_API_KEY environment variable. See https://openweathermap.org/faq#error401"
            }), 401

        if res.status_code != 200 or "main" not in data:
            app.logger.debug('OpenWeatherMap failed: status=%s body=%s', res.status_code, data)
            return jsonify({
                "error": "Weather data not found",
                "details": data
            }), 404

        weather = {
            "state": state_title,
            "representative_city": city_api_name,
            "temperature": round(data["main"]["temp"], 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "humidity": data["main"]["humidity"],
            "condition": data["weather"][0]["description"].title(),
            "wind_speed": data["wind"]["speed"]
        }
        return jsonify(weather)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ML
from sklearn.linear_model import LinearRegression
import numpy as np

@app.route('/predict_trend/<state_name>', methods=['GET','POST'])
def predict_trend(state_name):
    # Filter city data for the state
    state_cities = cities_df[cities_df['state_name'].str.lower() == state_name.lower()]
    if state_cities.empty:
        return jsonify({"error": "State not found"}), 404

    # Get unique categories in the state
    categories = state_cities['category'].dropna().unique()

    # Prepare result dictionary
    category_predictions = {}

    for category in categories:
        cat_cities = state_cities[state_cities['category'] == category]
        avg_rating = cat_cities['tourist_rating'].mean()

        df = states_complete_df[states_complete_df['state_name'].str.lower() == state_name.lower()]
        if df.empty:
            continue

        visitor_cols = [col for col in df.columns if col.startswith('visitors_')]
        years_past = np.array([int(c.split('_')[1]) for c in visitor_cols]).reshape(-1, 1)
        visitors = df[visitor_cols].values.flatten()

        if len(visitors) < 2:
            continue

        model = LinearRegression()
        model.fit(years_past, visitors)

        future_years = np.array([2026, 2027, 2028]).reshape(-1, 1)
        predicted_visitors = model.predict(future_years)

        max_rating = 5.0
        adj_predictions = (predicted_visitors * (avg_rating / max_rating)).astype(int)

        category_predictions[category] = {
            "average_tourist_rating": round(avg_rating, 2),
            "predicted_visitors_by_year": {
                str(year[0]):int(val) for year, val in zip(future_years, adj_predictions)
            }
        }

    return jsonify({
        "state": state_name,
        "category_predictions": category_predictions
    })

# Get future predictions for a specific state and category
@app.route('/predict_trend/<state_name>/<category>', methods=['GET'])
def predict_trend_by_category(state_name, category):
    # Filter city data for the state and category
    state_cities = cities_df[
        (cities_df['state_name'].str.lower() == state_name.lower()) &
        (cities_df['category'].str.lower() == category.lower())
    ]
    
    if state_cities.empty:
        return jsonify({"error": "State or category not found"}), 404

    # Get state data
    df = states_complete_df[states_complete_df['state_name'].str.lower() == state_name.lower()]
    if df.empty:
        return jsonify({"error": "State not found"}), 404

    # Get visitor data
    visitor_cols = [col for col in df.columns if col.startswith('visitors_')]
    years_past = np.array([int(c.split('_')[1]) for c in visitor_cols]).reshape(-1, 1)
    visitors = df[visitor_cols].values.flatten()

    if len(visitors) < 2:
        return jsonify({"error": "Insufficient data for prediction"}), 400

    # Create model and predict
    model = LinearRegression()
    model.fit(years_past, visitors)

    # Historical data
    historical_data = []
    for i, col in enumerate(visitor_cols):
        year = int(col.split('_')[1])
        historical_data.append({
            "year": year,
            "visitors": int(visitors[i]) if pd.notna(visitors[i]) else 0
        })

    # Future predictions
    future_years = np.array([2026, 2027, 2028]).reshape(-1, 1)
    predicted_visitors = model.predict(future_years)

    future_data = []
    for year, visitors in zip(future_years.flatten(), predicted_visitors):
        future_data.append({
            "year": int(year),
            "visitors": int(visitors)
        })

    return jsonify({
        "state": state_name,
        "category": category,
        "historical_data": historical_data,
        "future_predictions": future_data,
        "model_accuracy": "Linear Regression based on historical visitor trends"
    })


from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

@app.route('/cluster_states', methods=['GET'])
def cluster_states():
    features = ['population', 'gdp_inr_crore', 'safety_index', 'literacy_rate']
    df = states_complete_df[features].dropna()
    X = StandardScaler().fit_transform(df)

    kmeans = KMeans(n_clusters=4, random_state=42)
    clusters = kmeans.fit_predict(X)

    states_complete_df['cluster'] = clusters
    result = states_complete_df[['state_name', 'cluster']].to_dict(orient='records')

    return jsonify({
        "total_clusters": 4,
        "cluster_summary": result
    })


if __name__ == '__main__':
    # Disable the Werkzeug auto-reloader on Windows to avoid occasional
    # OSError: [WinError 10038] when the reloader's thread/server interact
    # poorly with the system selector. In development you can set debug
    # True but keep use_reloader False to avoid the issue.
    app.run(debug=True, use_reloader=False)
