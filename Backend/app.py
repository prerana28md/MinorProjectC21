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

# Connect to MongoDB Atlas with error handling and timeouts
from dotenv import load_dotenv
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")

try:
    # Set shorter timeouts and add retryWrites
    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000,  # 5 second timeout
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
        retryWrites=True
    )
    # Test the connection
    client.admin.command('ping')
    print("Successfully connected to MongoDB.")
    db = client["tourism_db"]
    users_collection = db["users"]
except Exception as e:
    print(f"Warning: MongoDB connection failed: {str(e)}")
    print("The application will continue with limited functionality (user features disabled).")
    client = None
    db = None
    users_collection = None


# In-memory user store for demo authentication
users = {}

# Load data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

states_complete_df = pd.read_csv(os.path.join(BASE_DIR, "data", "states_complete.csv"))
cities_df = pd.read_csv(os.path.join(BASE_DIR, "data", "cities.csv"))
risk_df = pd.read_csv(os.path.join(BASE_DIR, "data", "risk_data.csv"))

if 'state_name' in cities_df.columns:
    cities_df['state_name'] = cities_df['state_name'].str.strip()
# ---------------------------------------------
# 🔐 USER AUTHENTICATION (Register / Login)
# ---------------------------------------------
from flask import request, jsonify
from datetime import datetime

@app.route('/register', methods=['GET', 'POST'])
def register():
    if users_collection is None:
        return jsonify({"error": "User registration is currently unavailable"}), 503

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

    try:
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
    except Exception as e:
        print(f"Database operation failed: {str(e)}")
        return jsonify({"error": "Registration failed due to database error"}), 503

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
    if users_collection is None:
        return jsonify({"error": "Login service is currently unavailable"}), 503

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    try:
        user = users_collection.find_one({"username": username})
        if not user or not bcrypt.check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({"message": "Login successful", "username": username})
    except Exception as e:
        print(f"Login failed: {str(e)}")
        return jsonify({"error": "Login failed due to database error"}), 503


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

@app.route('/cities', methods=['GET'])
def get_all_cities():
    try:
        # Extract unique city names from cities_df
        cities_list = cities_df['city_name'].dropna().unique().tolist()
        cities_list.sort()
        return jsonify({"status": "success", "cities": cities_list})
    except Exception as e:
        print(f"Error fetching all cities: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to fetch cities"}), 500


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
        df.drop_duplicates(subset=['city_name'], inplace=True)
        df.sort_values('city_name', inplace=True)
        
        # Convert NaN to None for proper JSON conversion
        df = df.where(pd.notnull(df), None)
        
        cities_objects = df.to_dict(orient='records')
        
        print(f"Found {len(cities_objects)} cities for state: {state_name}")
        return jsonify(cities_objects)
        
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
  "Adilabad": "Adilabad",
  "Agartala": "Agartala",
  "Agra": "Agra",
  "Ahmedabad": "Ahmedabad",
  "Aizawl": "Aizawl",
  "Ajmer": "Ajmer",
  "Alibaug": "Alibaug",
  "Allahabad (Prayagraj)": "Prayagraj",
  "Alleppey": "Alappuzha",
  "Almora": "Almora",
  "Amaravati": "Amaravati",
  "Amritsar": "Amritsar",
  "Anandpur Sahib": "Anandpur Sahib",
  "Ananthagiri Hills": "Ananthagiri Hills",
  "Andro Village": "Andro",
  "Araku Valley": "Araku",
  "Auli": "Auli",
  "Aurangabad (Ajanta & Ellora Caves)": "Aurangabad",
  "Ayodhya": "Ayodhya",
  "Badami": "Badami",
  "Badrinath": "Badrinath",
  "Balpakram National Park": "Balpakram",
  "Barnawapara Wildlife Sanctuary": "Barnawapara",
  "Bastar": "Bastar",
  "Bathinda": "Bathinda",
  "Bekal Fort": "Bekal",
  "Bengaluru": "Bangalore",
  "Berhampur": "Berhampur",
  "Betla National Park": "Betla",
  "Bhalukpong": "Bhalukpong",
  "Bhongir": "Bhongir",
  "Bhopal": "Bhopal",
  "Bhubaneswar": "Bhubaneswar",
  "Bijapur": "Bijapur",
  "Bikaner": "Bikaner",
  "Bishnupur": "Bishnupur",
  "Bodh Gaya": "Bodh Gaya",
  "Bomdila": "Bomdila",
  "Calangute": "Calangute",
  "Chabimura": "Chabimura",
  "Chamba": "Chamba",
  "Champhai": "Champhai",
  "Chandigarh": "Chandigarh",
  "Chennai": "Madras",
  "Cherrapunji": "Cherrapunji",
  "Chikmagalur": "Chikmagalur",
  "Chilika Lake": "Bhubaneswar",
  "Chitrakote Falls": "Jagdalpur",
  "Chittorgarh": "Chittorgarh",
  "Kodagu": "Madikeri",
  "Cuttack": "Cuttack",
  "Dalhousie": "Dalhousie",
  "Dampa Tiger Reserve": "Aizawl",
  "Dandami Luxury Resort": "Itanagar",
  "Daringbadi": "Daringbadi",
  "Darjeeling": "Darjeeling",
  "Dassam Falls": "Ranchi",
  "Dawki": "Dawki",
  "Dehradun": "Dehradun",
  "Deoghar": "Deoghar",
  "Dharamshala": "Dharamshala",
  "Dibrugarh": "Dibrugarh",
  "Digha": "Digha",
  "Dimapur": "Dimapur",
  "Dirang": "Dirang",
  "Dooars": "Dooars",
  "Dumboor Lake": "Dumboor",
  "Dzukou Valley": "Kohima",
  "Gangtok": "Gangtok",
  "Gaya": "Gaya",
  "Giridih": "Giridih",
  "Gokarna": "Gokarna",
  "Guwahati": "Gauhati",
  "Gwalior": "Gwalior",
  "Haflong": "Haflong",
  "Hajo": "Hajo",
  "Hampi": "Hampi",
  "Haridwar": "Haridwar",
  "Hazaribagh": "Hazaribagh",
  "Horsley Hills": "Horsley Hills",
  "Hundru Falls": "Ranchi",
  "Hyderabad": "Hyderabad",
  "Imphal": "Imphal",
  "Indore": "Indore",
  "Itanagar": "Itanagar",
  "Jabalpur": "Jabalpur",
  "Jagdalpur": "Jagdalpur",
  "Jaipur": "Jaipur",
  "Jaisalmer": "Jaisalmer",
  "Jalandhar": "Jalandhar",
  "Jalpaiguri": "Jalpaiguri",
  "Jampui Hills": "Jampui",
  "Jamshedpur": "Tatanagar",
  "Jhansi": "Jhansi",
  "Jim Corbett": "Ramnagar",
  "Jodhpur": "Jodhpur",
  "Jog Falls": "Sagara",
  "Jorhat": "Jorhat",
  "Jowai": "Jowai",
  "Kalimpong": "Kalimpong",
  "Kanchipuram": "Kanchipuram",
  "Kanger Valley National Park": "Jagdalpur",
  "Kangla Fort": "Imphal",
  "Kanha National Park": "Kanha",
  "Kapurthala": "Kapurthala",
  "Karimnagar": "Karimnagar",
  "Kasol": "Kasol",
  "Kaziranga National Park": "Kaziranga",
  "Kedarnath": "Kedarnath",
  "Keibul Lamjao National Park": "Imphal",
  "Kesaria Stupa": "Motihari",
  "Khajuraho": "Khajuraho",
  "Khammam": "Khammam",
  "Khonoma Village": "Kohima",
  "Kochi": "Cochin",
  "Kodaikanal": "Kodaikanal",
  "Kohima": "Kohima",
  "Kolhapur": "Kolhapur",
  "Kolkata": "Calcutta",
  "Konark": "Konark",
  "Kovalam": "Kovalam",
  "Kullu": "Kullu",
  "Kumarakom": "Kumarakom",
  "Kurnool": "Kurnool",
  "Kurukshetra": "Kurukshetra",
  "Lachen": "Lachen",
  "Lachung": "Lachung",
  "Laitlum Canyons": "Shillong",
  "Lepakshi": "Lepakshi",
  "Loktak Lake": "Imphal",
  "Lonavala": "Lonavala",
  "Longleng": "Longleng",
  "Lucknow": "Lucknow",
  "Ludhiana": "Ludhiana",
  "Lunglei": "Lunglei",
  "Madurai": "Madurai",
  "Mahabaleshwar": "Mahabaleshwar",
  "Mainpat": "Mainpat",
  "Majuli Island": "Majuli",
  "Manali": "Manali",
  "Manas National Park": "Manas",
  "Mathura": "Mathura",
  "Mawlynnong": "Mawlynnong",
  "Mawsynram": "Mawsynram",
  "McLeod Ganj": "McLeod Ganj",
  "Mechuka": "Mechuka",
  "Medak": "Medak",
  "Melaghar": "Melaghar",
  "Mokokchung": "Mokokchung",
  "Mon": "Mon",
  "Moreh": "Moreh",
  "Mount Abu": "Mount Abu",
  "Mumbai": "Bombay",
  "Munnar": "Munnar",
  "Murlen National Park": "Aizawl",
  "Murshidabad": "Murshidabad",
  "Mussoorie": "Mussoorie",
  "Mysuru": "Mysore",
  "Nagarjuna Sagar": "Nagarjuna Sagar",
  "Nagpur": "Nagpur",
  "Nainital": "Nainital",
  "Nalanda": "Nalanda",
  "Namchi": "Namchi",
  "Namdapha National Park": "Namdapha",
  "Nashik": "Nashik",
  "Nathula Pass": "Gangtok",
  "Neermahal": "Agartala",
  "Nellore": "Nellore",
  "Netarhat": "Netarhat",
  "Nizamabad": "Nizamabad",
  "Noida": "Noida",
  "Nongriat": "Nongriat",
  "Ooty": "Ooty",
  "Orchha": "Orchha",
  "Pachmarhi": "Pachmarhi",
  "Panaji": "Panaji",
  "Pasighat": "Pasighat",
  "Patiala": "Patiala",
  "Patna": "Patna",
  "Patratu Valley": "Ranchi",
  "Pawapuri": "Pawapuri",
  "Pelling": "Pelling",
  "Phawngpui Peak": "Aizawl",
  "Phek": "Phek",
  "Pune": "Pune",
  "Puri": "Puri",
  "Pushkar": "Pushkar",
  "Raghurajpur": "Raghurajpur",
  "Raipur": "Raipur",
  "Rajgir": "Rajgir",
  "Rameswaram": "Rameswaram",
  "Ranchi": "Ranchi",
  "Rann of Kutch": "Bhuj",
  "Ranthambore": "Ranthambore",
  "Ravangla": "Ravangla",
  "Reiek": "Aizawl",
  "Rishikesh": "Rishikesh",
  "Roing": "Roing",
  "Sanchi": "Sanchi",
  "Sarnath": "Sarnath",
  "Sasaram": "Sasaram",
  "Sendra Island": "Igatpuri",
  "Sepahijala Wildlife Sanctuary": "Agartala",
  "Serchhip": "Serchhip",
  "Shantiniketan": "Bolpur",
  "Shillong": "Sohra",
  "Shimla": "Simla",
  "Shirdi": "Shirdi",
  "Simlipal National Park": "Baripada",
  "Sirpur": "Sirpur",
  "Sivasagar": "Sivasagar",
  "Solang Valley": "Manali",
  "Spiti Valley": "Kaza",
  "Srisailam": "Srisailam",
  "Sundarbans": "Sundarbans",
  "Tamdil Lake": "Aizawl",
  "Tarn Taran Sahib": "Tarn Taran",
  "Tawang": "Tawang",
  "Tezpur": "Tezpur",
  "Thekkady": "Thekkady",
  "Thenzawl": "Thenzawl",
  "Thoubal": "Thoubal",
  "Thrissur": "Thrissur",
  "Tirathgarh Falls": "Jagdalpur",
  "Tirupati": "Tirupati",
  "Trishna Wildlife Sanctuary": "Agartala",
  "Tsomgo Lake": "Gangtok",
  "Tuophema": "Tuophema",
  "Tura": "Tura",
  "Udaipur": "Udaipur",
  "Udayagiri": "Udayagiri",
  "Udupi": "Udupi",
  "Ujjain": "Ujjain",
  "Ukhrul": "Ukhrul",
  "Unakoti": "Unakoti",
  "Vaishali": "Vaishali",
  "Varanasi": "Varanasi",
  "Varkala": "Varkala",
  "Vijayawada": "Bezawada",
  "Vikramshila": "Vikramshila",
  "Visakhapatnam": "Vishakhapatnam",
  "Vrindavan": "Vrindavan",
  "Wagah Border": "Amritsar",
  "Warangal": "Warangal",
  "Wayanad": "Wayanad",
  "Wokha": "Wokha",
  "Yumthang Valley": "Gangtok",
  "Ziro Valley": "Ziro",
  "Zuluk": "Gangtok",
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


@app.route('/compare/states', methods=['POST','GET'])
def compare_states():
    data = request.json
    state1 = data.get('state1')
    state2 = data.get('state2')
    if not state1 or not state2:
        return jsonify({"error": "state1 and state2 are required"}), 400

    def safe_split(s):
        if not s:
            return []
        return [x.strip().strip("'\"") for x in s.strip("[] ").split(',') if x.strip()]

    try:
        # Filter states
        df1 = states_complete_df[states_complete_df['state_name'].str.lower() == state1.lower()]
        df2 = states_complete_df[states_complete_df['state_name'].str.lower() == state2.lower()]

        if df1.empty or df2.empty:
            return jsonify({"error": "One or both states not found"}), 404

        # Identify top city based on highest tourist_rating from cities_df
        def get_top_city(state):
            cities = cities_df[cities_df['state_name'].str.lower() == state.lower()]
            if cities.empty:
                return ''
            # Fill NaNs to 0 for rating and select city with max rating
            cities['tourist_rating'] = cities['tourist_rating'].fillna(0)
            top_city_row = cities.loc[cities['tourist_rating'].idxmax()]
            return top_city_row['city_name']

        top_city1 = get_top_city(state1)
        top_city2 = get_top_city(state2)

        # Extract visitors counts for each year
        visitors_yrs = [2020, 2021, 2022, 2023, 2024, 2025]
        visitors_data = {}
        for year in visitors_yrs:
            visitors_data[year] = {
                state1: int(df1.iloc[0].get(f'visitors_{year}', 0)),
                state2: int(df2.iloc[0].get(f'visitors_{year}', 0))
            }

        comp_data = {
            'visitors_2020': visitors_data[2020],
            'visitors_2021': visitors_data[2021],
            'visitors_2022': visitors_data[2022],
            'visitors_2023': visitors_data[2023],
            'visitors_2024': visitors_data[2024],
            'visitors_2025': visitors_data[2025],
            'famous_for': {
                state1: safe_split(df1.iloc[0].get('famous_for')),
                state2: safe_split(df2.iloc[0].get('famous_for')),
            },
            'top_category': {
                state1: safe_split(df1.iloc[0].get('famous_for'))[0] if df1.iloc[0].get('famous_for') else 'General',
                state2: safe_split(df2.iloc[0].get('famous_for'))[0] if df2.iloc[0].get('famous_for') else 'General',
            },
            'top_city': {
                state1: top_city1,
                state2: top_city2,
            },
            'best_season': {
                state1: safe_split(df1.iloc[0].get('best_season'))[0] if df1.iloc[0].get('best_season') else 'Year-round',
                state2: safe_split(df2.iloc[0].get('best_season'))[0] if df2.iloc[0].get('best_season') else 'Year-round',
            },
            'population': {
                state1: int(df1.iloc[0].get('population', 0)),
                state2: int(df2.iloc[0].get('population', 0)),
            },
            'literacy_rate': {
                state1: float(df1.iloc[0].get('literacy_rate', 0)),
                state2: float(df2.iloc[0].get('literacy_rate', 0)),
            },
            'gdp_inr_crore': {
                state1: float(df1.iloc[0].get('gdp_inr_crore', 0)),
                state2: float(df2.iloc[0].get('gdp_inr_crore', 0)),
            },
            'area_km2': {
                state1: float(df1.iloc[0].get('area_km2', 0)),
                state2: float(df2.iloc[0].get('area_km2', 0)),
            },
            'safety_index': {
                state1: float(df1.iloc[0].get('safety_index', 1)),
                state2: float(df2.iloc[0].get('safety_index', 1)),
            },
            'capital': {
                state1: df1.iloc[0].get('capital', ''),
                state2: df2.iloc[0].get('capital', ''),
            },
            'region': {
                state1: df1.iloc[0].get('region', ''),
                state2: df2.iloc[0].get('region', ''),
            }
        }

        return jsonify(comp_data)

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({"error": "Server error", "details": str(e)}), 500

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
