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
    try:
        # Get unique categories from the actual dataset
        unique_categories = cities_df['category'].dropna().unique().tolist()
        # Sort them for better user experience
        unique_categories.sort()
        return jsonify({
            "status": "success",
            "interests": unique_categories,
            "count": len(unique_categories)
        })
    except Exception as e:
        print(f"Error fetching interests: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to fetch interests",
            "error": str(e)
        }), 500


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
# Risk data for state
@app.route('/states/<state_name>/risk', methods=['GET'])
def state_risk(state_name):
    try:
        # Try multiple matching strategies for robust state name matching
        # 1. Exact case-insensitive match
        df = risk_df[risk_df['state'].str.strip().str.lower() == state_name.strip().lower()]
        
        # 2. If no match, try partial match
        if df.empty:
            df = risk_df[risk_df['state'].str.strip().str.lower().str.contains(state_name.strip().lower(), na=False)]
        
        # 3. Try with normalized spaces removed
        if df.empty:
            state_normalized = state_name.strip().lower().replace(' ', '')
            df = risk_df[risk_df['state'].str.strip().str.lower().str.replace(' ', '') == state_normalized]
        
        if df.empty:
            # Log available states for debugging
            available_states = risk_df['state'].dropna().unique().tolist()
            print(f"[DEBUG] No match for state_name='{state_name}'")
            print(f"[DEBUG] Available states: {available_states}")
            
            # Return empty but valid response instead of 404
            return jsonify({
                'state': state_name,
                'risk_index': 0,
                'risks': {},
                'health_alerts': 'No risk data available for this state',
                'safety_suggestions': 'General travel precautions recommended',
                'insurance_available': '',
                'major_disaster_years': '',
                'hotspot_districts': ''
            })
        
        risk_data = df.iloc[0].to_dict()
        
        # Extract specific fields
        health_alerts = risk_data.get('health_alerts', '')
        safety_suggestions = risk_data.get('safety_suggestions', '')
        
        # Filter risk types - include ALL non-null, non-empty values
        filtered_risks = {}
        risk_columns = [
            'flood_risk', 'landslide_risk', 'earthquake_zone', 
            'crime_rate', 'accident_rate', 'cyclone_risk', 
            'drought_risk', 'forest_fire_risk', 'sea_erosion_risk'
        ]
        
        for col in risk_columns:
            if col not in risk_data:
                continue
                
            value = risk_data[col]
            
            # Skip only if value is null, undefined, or empty/NaN string
            if pd.isna(value):
                continue
            
            # Convert to string for checking
            str_value = str(value).strip()
            
            # Skip empty strings or "nan" strings
            if str_value == '' or str_value.lower() == 'nan':
                continue
            
            # Include ALL other values (numbers including 0, and strings like "Zone III")
            filtered_risks[col] = value
        
        return jsonify({
            'state': risk_data.get('state', state_name),
            'risk_index': risk_data.get('risk_index', 0),
            'risks': filtered_risks,
            'health_alerts': health_alerts if pd.notna(health_alerts) and str(health_alerts).strip() != '' else '',
            'safety_suggestions': safety_suggestions if pd.notna(safety_suggestions) and str(safety_suggestions).strip() != '' else '',
            'insurance_available': risk_data.get('insurance_available', ''),
            'major_disaster_years': risk_data.get('major_disaster_years', ''),
            'hotspot_districts': risk_data.get('hotspot_districts', '')
        })
        
    except Exception as e:
        print(f"[ERROR] in state_risk endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'state': state_name,
            'risk_index': 0,
            'risks': {},
            'health_alerts': 'Error loading risk data',
            'safety_suggestions': 'General travel precautions recommended',
            'insurance_available': '',
            'major_disaster_years': '',
            'hotspot_districts': ''
        }), 200


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
    try:
        # Try multiple matching strategies
        # 1. Exact match (case-insensitive)
        df = cities_df[cities_df['state_name'].str.lower() == state_name.lower()]
        
        # 2. If no exact match, try partial match
        if df.empty:
            df = cities_df[cities_df['state_name'].str.lower().str.contains(state_name.lower(), na=False)]
        
        # 3. If still empty, try with spaces removed
        if df.empty:
            state_normalized = state_name.lower().replace(' ', '')
            df = cities_df[cities_df['state_name'].str.lower().str.replace(' ', '') == state_normalized]
        
        if df.empty:
            # Log available states for debugging
            available_states = cities_df['state_name'].unique().tolist()
            print(f"No cities found for state: {state_name}")
            print(f"Available states in cities.csv: {available_states}")
            # Return empty array instead of 404 to avoid breaking frontend
            return jsonify([])
        
        # Get unique cities from the dataframe
        cities_list = df['city_name'].dropna().unique().tolist()
        
        # Sort alphabetically for better UX
        cities_list.sort()
        
        print(f"Found {len(cities_list)} cities for state: {state_name}")
        return jsonify(cities_list)
        
    except Exception as e:
        print(f"Error in state_cities endpoint: {str(e)}")
        return jsonify([])

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
@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        interests = data.get('interests', [])  # List of interests
        month = data.get('month', '')
        max_risk = data.get('max_risk', 1.0)
        min_rating = data.get('min_rating', 0)

        print(f"[RECOMMEND] Received {len(interests)} interests: {interests}")

        if not interests:
            return jsonify({'recommendations': [], 'message': 'No interests provided'})

        # ✅ KEY FIX: Use .isin() to match ANY of the selected interests
        filtered_cities = cities_df[cities_df['category'].isin(interests)].copy()
        
        print(f"[RECOMMEND] Found {len(filtered_cities)} cities matching interests")

        # Apply month filter if specified
        if month:
            filtered_cities = filtered_cities[
                filtered_cities['popular_months'].str.contains(month, case=False, na=False)
            ]

        # Apply risk filter
        filtered_cities = filtered_cities[
            (filtered_cities['risk_index'] * 10) <= max_risk
        ]

        # Apply rating filter
        filtered_cities = filtered_cities[
            filtered_cities['tourist_rating'] >= min_rating
        ]

        # Sort by rating (highest first)
        filtered_cities = filtered_cities.sort_values('tourist_rating', ascending=False)

        # Convert to list
        recommendations = []
        for _, row in filtered_cities.iterrows():
            recommendations.append({
                'state_name': row['state_name'],
                'city_name': row['city_name'],
                'category': row['category'],
                'description': row.get('description', ''),
                'tourist_rating': float(row['tourist_rating']) if pd.notna(row['tourist_rating']) else 0,
                'risk_index': float(row['risk_index']) if pd.notna(row['risk_index']) else 0,
                'best_time_to_visit': row.get('best_time_to_visit', ''),
                'popular_months': row.get('popular_months', ''),
                'latitude': float(row['latitude']) if pd.notna(row['latitude']) else 0,
                'longitude': float(row['longitude']) if pd.notna(row['longitude']) else 0
            })

        print(f"[RECOMMEND] Returning {len(recommendations)} recommendations")

        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations)
        })

    except Exception as e:
        print(f"[ERROR] in recommend: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'recommendations': []}), 500


@app.route('/debug/categories', methods=['GET'])
def debug_categories():
    categories = cities_df['category'].dropna().unique().tolist()
    return jsonify({
        "total_categories": len(categories),
        "categories": sorted(categories)
    })
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
# City name mapping for OpenWeatherMap API
city_map = {
    # Karnataka
    "Mysuru": "Mysore",
    "Bengaluru": "Bangalore",
    "Kodagu": "Madikeri",  # Hill headquarters, covers "Coorg"
    "Coorg": "Madikeri",

    # Kerala
    "Thiruvananthapuram": "Trivandrum",
    "Kochi": "Cochin",
    "Alappuzha": "Alleppey",
    "Alleppey": "Alappuzha",

    # Tamil Nadu
    "Chennai": "Madras",    # "Chennai" is now canonical, "Madras" is legacy
    "Madurai": "Madurai",
    "Kanyakumari": "Kanyakumari",
    "Ooty": "Ootacamund",
    "Ootacamund": "Ooty",

    # Delhi/NCR
    "New Delhi": "Delhi",

    # Maharashtra
    "Mumbai": "Bombay",
    "Pune": "Poona",
    "Aurangabad": "Aurangabad",

    # Uttar Pradesh
    "Prayagraj": "Allahabad",
    "Varanasi": "Benares",
    "Agra": "Agra",

    # Rajasthan
    "Jaipur": "Jaipur",
    "Udaipur": "Udaipur",
    "Jodhpur": "Jodhpur",
    "Jaisalmer": "Jaisalmer",

    # West Bengal
    "Kolkata": "Calcutta",
    "Darjeeling": "Darjeeling",

    # Himachal Pradesh
    "Shimla": "Simla",
    "Manali": "Manali",
    "Dharamshala": "Dharamsala",

    # Uttarakhand
    "Dehradun": "Dehra Dun",
    "Rishikesh": "Rishikesh",
    "Nainital": "Nainital",
    "Mussoorie": "Mussoorie",
    "Haridwar": "Hardwar",

    # Goa
    "Panaji": "Panjim",
    "Panjim": "Panaji",

    # Gujarat
    "Ahmedabad": "Ahmadabad",
    "Vadodara": "Vadodara",

    # Other states and notable cities
    "Hyderabad": "Hyderabad",
    "Visakhapatnam": "Vishakhapatnam",
    "Vijayawada": "Bezawada",

    "Amritsar": "Amritsar",
    "Chandigarh": "Chandigarh",
    "Bhubaneswar": "Bhubaneshwar",
    "Puri": "Purī",
    "Gangtok": "Gangtok",
    "Guwahati": "Gauhati",
    "Imphal": "Imphal",
    "Shillong": "Sohra",  # Also handles Cherrapunji as Sohra
    "Aizawl": "Aizawl",
    "Kohima": "Kohima",
    "Itanagar": "Itanagar",
    "Agartala": "Agartala",
    "Patna": "Patna",
    "Ranchi": "Ranchi",
    "Jamshedpur": "Tatanagar",
    "Jagdalpur": "Jagdalpur",

    # Sikkim
    "Gangtok": "Gangtok",

    # Common variations
    "Pondicherry": "Puducherry",
    "Orissa": "Odisha"
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
# ---------------------------------------------
# 🔹 WEATHER FOR A CITY
# ---------------------------------------------
@app.route('/weather/city/<city_name>', methods=['GET'])
def get_city_weather(city_name):
    # Clean up city name - remove parentheses and extra content
    clean_city = city_name.split('(')[0].strip()  # "Coorg (Kodagu)" -> "Coorg"
    
    # Map to API-compatible name
    api_city_name = city_map.get(clean_city, clean_city)
    
    try:
        ok, key_or_msg = _ensure_api_key()
        if not ok:
            return jsonify({"error": "Missing API key", "message": key_or_msg}), 500

        url = (
            f"http://api.openweathermap.org/data/2.5/weather?q={api_city_name},IN"
            f"&appid={key_or_msg}&units=metric"
        )
        
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
                "help": "Verify your WEATHER_API_KEY / OPENWEATHER_API_KEY environment variable."
            }), 401

        if res.status_code != 200 or "main" not in data:
            app.logger.debug('OpenWeatherMap failed: status=%s body=%s', res.status_code, data)
            return jsonify({
                "error": "Weather data not found",
                "details": data,
                "searched_city": api_city_name
            }), 404

        weather = {
            "city": data["name"],
            "temperature": round(data["main"]["temp"], 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "humidity": data["main"]["humidity"],
            "pressure": data["main"].get("pressure", 0),
            "condition": data["weather"][0]["description"].title(),
            "wind_speed": data["wind"]["speed"],
            "visibility": data.get("visibility", 0) / 1000 if data.get("visibility") else 0,
            "clouds": data.get("clouds", {}).get("all", 0)
        }
        return jsonify(weather)

    except Exception as e:
        return jsonify({"error": str(e), "searched_city": api_city_name}), 500

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
                "help": "Verify your WEATHER_API_KEY / OPENWEATHER_API_KEY environment variable."
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
            "pressure": data["main"].get("pressure", 0),  # Added pressure
            "condition": data["weather"][0]["description"].title(),
            "wind_speed": data["wind"]["speed"],
            "visibility": data.get("visibility", 0) / 1000 if data.get("visibility") else 0,  # Convert to km
            "clouds": data.get("clouds", {}).get("all", 0)
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
