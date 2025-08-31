# Last test on 0926 hrs 26 Aug 2025

import os
import sqlite3
import json
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import google.generativeai as genai
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import logging
import pytz

# Section 1: Configuration and Logging
# This section sets up environment variables, constants, and logging.
# Environment variables are loaded from the system for flexibility in deployment.
APP_PORT = int(os.environ.get("PORT", 5000))  # Port for the Flask app to run on
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")  # API key for Google Gemini AI
JWT_SECRET = os.environ.get("JWT_SECRET", "aIbes4gYRkx-KRuAE8ryCZhx1T6FTXjjFApCPtjp5To")  # Secret for JWT token signing
JWT_ALGO = "HS256"  # Algorithm for JWT encoding/decoding
DB_PATH = os.environ.get("DB_PATH", "nutrietary.db")  # Path to SQLite database file
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")  # Allowed CORS origins
MYT = pytz.timezone('Asia/Kuala_Lumpur')  # Timezone for Malaysia

# Custom preferences configuration
CUSTOM_PREFERENCES_MAX_LENGTH = 500  # Maximum length for user custom preferences

# Set up logging to INFO level for debugging and monitoring
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Section 2: AI Model Configuration
# Configure Google Gemini AI if the API key is provided.
# This sets up the generative model for meal plan generation.
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    MODEL = genai.GenerativeModel("gemini-2.5-flash")  # Use Gemini 2.5 Flash model
else:
    MODEL = None  # If no API key, AI features will be disabled
    logger.warning("GEMINI_API_KEY not set. AI features will be unavailable.")

# Section 3: Flask App Setup
# Initialize Flask app and enable CORS for cross-origin requests.
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})  # Allow requests from specified origins

# Section 4: Database Helpers
# These functions manage SQLite database connections and initialization.
def get_db():
    """
    Returns a sqlite3 connection with row factory. Uses flask.g to reuse connection per request.
    This ensures efficient database access within a request context.
    """
    db = getattr(g, "_database", None)
    if db is None:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)  # Connect to DB, allow multi-thread access
        conn.row_factory = sqlite3.Row  # Return rows as dict-like objects
        g._database = conn  # Store in Flask's g for request-scoped reuse
    return g._database

@app.teardown_appcontext
def close_connection(exception):
    # Close the database connection at the end of each request
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def init_db():
    # Initialize the database by creating necessary tables if they don't exist
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create 'users' table for storing user credentials
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP
        )
    """)

    # Create 'user_preferences' table for storing user dietary settings, including custom preferences
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            dietary_preferences TEXT,
            budget REAL,
            days INTEGER DEFAULT 3,
            meal_types TEXT,
            custom_preferences TEXT,
            updated_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Create 'meal_plans' table for storing generated meal plans and grocery lists as JSON
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meal_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT,
            plan_json TEXT NOT NULL,
            grocery_json TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Create 'conversations' table for logging user-AI interactions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_message TEXT,
            ai_response TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    conn.commit()  # Commit changes to the database
    conn.close()  # Close the connection
    logger.info("Database initialized successfully.")

# Initialize the database at application startup
init_db()

# Section 5: Authentication Utilities
# Functions for JWT token creation and validation.
def create_token(user_id, username, expires_minutes=60*24*7):
    """
    Creates a JWT token with an expiration timestamp in Malaysia Time.
    The token includes user ID, username, issuance time, and expiration.
    """
    payload = {
        "sub": str(user_id),  # Subject: user ID
        "username": username,
        "exp": datetime.now(MYT) + timedelta(minutes=expires_minutes),  # Expiration time in MYT
        "iat": datetime.now(MYT)  # Issued at time in MYT
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)  # Encode the payload
    if isinstance(token, bytes):
        token = token.decode("utf-8")  # Decode if bytes
    return token

def token_required(f):
    """
    Decorator to require a valid JWT token in the Authorization header.
    Verifies the token and sets g.current_user if valid.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", None)
        if not auth:
            return jsonify({"error": "Authorization header required"}), 401
        parts = auth.split()
        if parts[0].lower() != "bearer" or len(parts) != 2:
            return jsonify({"error": "Authorization header must be Bearer token"}), 401
        token = parts[1]
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])  # Decode and verify token
            g.current_user = {
                "id": int(data["sub"]),
                "username": data.get("username")
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        return f(*args, **kwargs)  # Proceed to the decorated function
    return decorated

# Section 6: AI Prompt Utilities
# Utility function to build prompts for Gemini AI.
def build_gemini_prompt(preferences: dict, days: int = 3):
    """
    Build a structured prompt template for Gemini.
    Enhanced to include custom preferences in the prompt.
    This prompt instructs the AI to generate a meal plan in a specific JSON format.
    """
    dietary = preferences.get("dietary_preferences", "no specific restrictions")
    budget = preferences.get("budget", "no budget specified")
    meal_types = preferences.get("meal_types", "breakfast,lunch,dinner")
    custom_prefs = preferences.get("custom_preferences", "").strip()

    # Sanitize and validate days parameter
    try:
        days_int = int(days)
        if days_int < 1 or days_int > 7:
            days_int = 3  # Default to 3 if out of range
    except Exception:
        days_int = 3  # Default if invalid

    # Build custom preferences section if provided
    custom_section = ""
    if custom_prefs:
        custom_section = f"\n- Additional custom requirements: {custom_prefs}"

    # Construct the prompt string with all constraints and required JSON schema
    prompt = f"""
You are an expert nutritionist and recipe writer. Generate a {days_int}-day meal plan tailored for malaysian user.
Constraints and requirements:
- Dietary preferences: {dietary}
- Budget (Malaysian Ringit): {budget}
- Meal types per day (comma separated): {meal_types}{custom_section}

IMPORTANT: Pay special attention to any allergies, medical conditions, or specific requirements mentioned in the custom requirements above.

Return a valid JSON object ONLY (no explanatory text) with the following schema:

{{
  "title": "string",
  "days": [
    {{
      "day": "Day 1",
      "meals": [
        {{
          "type": "breakfast|lunch|dinner|snack",
          "name": "Dish name",
          "servings": "2",
          "approx_prep_time_minutes": 20,
          "recipe": "Step by step instructions as a single string",
          "ingredients": [
            {{"name":"ingredient name","qty":"quantity","price":"optional"}}
          ]
        }}
      ]
    }}
  ],
  "grocery_list": [
    {{"item":"name","qty":"total qty","price":"optional"}}
  ]
}}

Be concise. Ensure JSON is parseable. If some fields are unknown, set them to empty string or sensible default.
Produce the JSON only.
"""
    return prompt

# Section 7: Flask Routes
# This section defines all API endpoints for the application.

# Add CORS headers to all responses for consistency
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', ALLOWED_ORIGINS if ALLOWED_ORIGINS else '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Home route: Provides service info and endpoint list
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "service": "Nutrietary - AI Dietary Planner (backend)",
        "endpoints": [
            "POST /register",
            "POST /login",
            "GET /me (protected)",
            "PUT /preferences (protected)",
            "GET /preferences (protected)",
            "POST /generate_mealplan (protected)",
            "GET /mealplans (protected)",
            "GET /mealplans/<id> (protected)",
            "DELETE /mealplans/<id> (protected)",
            "GET /health"
        ],
        "custom_preferences_max_length": CUSTOM_PREFERENCES_MAX_LENGTH
    })

# Register new user
@app.route("/register", methods=["POST"])
def register():
    try:
        payload = request.json or {}
        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""

        # Validate input
        if not username or not password:
            return jsonify({"error": "username and password required"}), 400
        if len(password) < 4:
            return jsonify({"error": "password must be at least 4 characters"}), 400

        conn = get_db()
        cur = conn.cursor()
        # Check if username already exists
        cur.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cur.fetchone():
            return jsonify({"error": "username already exists"}), 409

        # Hash password and insert new user
        pw_hash = generate_password_hash(password)
        now_in_myt = datetime.now(MYT)  # Use MYT for timestamp
        cur.execute("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)", (username, pw_hash, now_in_myt))
        conn.commit()
        user_id = cur.lastrowid
        token = create_token(user_id, username)  # Generate JWT token
        return jsonify({"success": True, "user_id": user_id, "username": username, "token": token}), 201

    except Exception as e:
        logger.exception("Register error")
        return jsonify({"error": str(e)}), 500

# Login existing user
@app.route("/login", methods=["POST"])
def login():
    try:
        payload = request.json or {}
        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""
        if not username or not password:
            return jsonify({"error": "username and password required"}), 400

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "invalid username or password"}), 401

        # Verify password hash
        if not check_password_hash(row["password_hash"], password):
            return jsonify({"error": "invalid username or password"}), 401

        token = create_token(row["id"], username)  # Generate JWT token
        return jsonify({"success": True, "user_id": row["id"], "username": username, "token": token})

    except Exception as e:
        logger.exception("Login error")
        return jsonify({"error": str(e)}), 500

# Get current user profile (protected)
@app.route("/me", methods=["GET"])
@token_required
def me():
    user = g.current_user
    return jsonify({"id": user["id"], "username": user["username"]})

# Update user preferences (protected) - includes custom_preferences validation
@app.route("/preferences", methods=["PUT"])
@token_required
def update_preferences():
    try:
        user = g.current_user
        payload = request.json or {}

        dietary = payload.get("dietary_preferences")
        budget = payload.get("budget")
        days = payload.get("days")
        meal_types = payload.get("meal_types")
        custom_prefs = payload.get("custom_preferences")

        # Validate custom preferences length
        if custom_prefs is not None:
            custom_prefs = str(custom_prefs).strip()
            if len(custom_prefs) > CUSTOM_PREFERENCES_MAX_LENGTH:
                return jsonify({
                    "error": f"Custom preferences cannot exceed {CUSTOM_PREFERENCES_MAX_LENGTH} characters. Current length: {len(custom_prefs)}"
                }), 400

        # Convert meal_types list to comma-separated string if needed
        if isinstance(meal_types, list):
            meal_types = ",".join([str(x).strip() for x in meal_types if x])

        conn = get_db()
        cur = conn.cursor()
        now_in_myt = datetime.now(MYT)  # Use MYT for timestamp

        # Check if preferences exist; update or insert accordingly
        cur.execute("SELECT id FROM user_preferences WHERE user_id = ?", (user["id"],))
        existing = cur.fetchone()
        if existing:
            # Update existing preferences, using COALESCE to keep unchanged fields
            cur.execute("""
                UPDATE user_preferences
                SET dietary_preferences = COALESCE(?, dietary_preferences),
                    budget = COALESCE(?, budget),
                    days = COALESCE(?, days),
                    meal_types = COALESCE(?, meal_types),
                    custom_preferences = COALESCE(?, custom_preferences),
                    updated_at = ?
                WHERE user_id = ?
            """, (dietary, budget, days, meal_types, custom_prefs, now_in_myt, user["id"]))
        else:
            # Insert new preferences
            cur.execute("""
                INSERT INTO user_preferences (user_id, dietary_preferences, budget, days, meal_types, custom_preferences, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user["id"], dietary, budget, days or 3, meal_types, custom_prefs, now_in_myt))
        conn.commit()
        return jsonify({"success": True, "message": "preferences saved"})

    except Exception as e:
        logger.exception("Update preferences error")
        return jsonify({"error": str(e)}), 500

# Get user preferences (protected)
@app.route("/preferences", methods=["GET"])
@token_required
def get_preferences():
    try:
        user = g.current_user
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT dietary_preferences, budget, days, meal_types, custom_preferences, updated_at
            FROM user_preferences
            WHERE user_id = ?
        """, (user["id"],))
        row = cur.fetchone()
        if not row:
            return jsonify({
                "success": True,
                "preferences": None,
                "custom_preferences_max_length": CUSTOM_PREFERENCES_MAX_LENGTH
            })
        prefs = {k: row[k] for k in row.keys()}  # Convert row to dict
        return jsonify({
            "success": True,
            "preferences": prefs,
            "custom_preferences_max_length": CUSTOM_PREFERENCES_MAX_LENGTH
        })
    except Exception as e:
        logger.exception("Get preferences error")
        return jsonify({"error": str(e)}), 500

# Generate meal plan using AI (protected) - supports overrides and uses custom preferences
@app.route("/generate_mealplan", methods=["POST"])
@token_required
def generate_mealplan():
    try:
        user = g.current_user
        payload = request.json or {}

        # Allow overrides from request body
        override_days = payload.get("days")
        override_prefs = payload.get("preferences")

        conn = get_db()
        cur = conn.cursor()
        # Fetch stored preferences
        cur.execute("""
            SELECT dietary_preferences, budget, days, meal_types, custom_preferences
            FROM user_preferences
            WHERE user_id = ?
        """, (user["id"],))
        row = cur.fetchone()
        prefs = {}
        if row:
            prefs = {k: row[k] for k in row.keys()}

        # Apply overrides if provided
        if override_prefs and isinstance(override_prefs, dict):
            prefs.update(override_prefs)

        days = override_days if override_days is not None else prefs.get("days", 3)

        # Build AI prompt using preferences
        prompt = build_gemini_prompt(prefs, days)

        # Call Gemini AI if configured
        if not MODEL:
            ai_text = "Gemini API not configured on server."
            ai_json = None
            logger.warning("Gemini not configured, returning placeholder text.")
        else:
            try:
                resp = MODEL.generate_content(prompt)  # Generate content from prompt
                ai_text = getattr(resp, "text", None) or (resp.get("output", "") if isinstance(resp, dict) else str(resp))
                ai_json = None
                try:
                    ai_json = json.loads(ai_text)  # Parse response as JSON
                except Exception:
                    import re
                    # Fallback: Extract JSON from text using regex if direct parse fails
                    m = re.search(r"(\{[\s\S]*})", ai_text)
                    if m:
                        try:
                            ai_json = json.loads(m.group(1))
                        except Exception:
                            ai_json = None
                logger.info("Gemini responded; parsed_json=%s", bool(ai_json))
            except Exception as e:
                logger.exception("Gemini call failed")
                ai_text = f"AI generation failed: {str(e)}"
                ai_json = None

        # Generate timestamp in MYT
        now_in_myt = datetime.now(MYT)

        # Save meal plan to database
        cur.execute("""
            INSERT INTO meal_plans (user_id, title, plan_json, grocery_json, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user["id"], (ai_json.get("title") if ai_json else None) or "", json.dumps(ai_json) if ai_json else ai_text, json.dumps(ai_json.get("grocery_list")) if (ai_json and ai_json.get("grocery_list")) else None, now_in_myt))
        conn.commit()
        plan_id = cur.lastrowid

        # Log the conversation in database
        cur.execute("""
            INSERT INTO conversations (user_id, user_message, ai_response, created_at)
            VALUES (?, ?, ?, ?)
        """, (user["id"], "Generate Meal Plan", ai_text if ai_text else json.dumps(ai_json), now_in_myt))
        conn.commit()

        return jsonify({
            "success": True,
            "plan_id": plan_id,
            "ai_text_snippet": ai_text[:1000] if ai_text else None,
            "parsed_json": ai_json
        }), 201

    except Exception as e:
        logger.exception("Generate mealplan error")
        return jsonify({"error": str(e)}), 500

# List meal plans with pagination (protected)
@app.route("/mealplans", methods=["GET"])
@token_required
def list_mealplans():
    try:
        user = g.current_user
        page = int(request.args.get("page", 1))  # Current page number
        per_page = int(request.args.get("per_page", 10))  # Items per page
        offset = (page - 1) * per_page  # Calculate offset for SQL

        conn = get_db()
        cur = conn.cursor()
        # Get total count of plans
        cur.execute("SELECT COUNT(*) as cnt FROM meal_plans WHERE user_id = ?", (user["id"],))
        total = cur.fetchone()["cnt"]

        # Fetch paginated plans, ordered by creation date descending
        cur.execute("""
            SELECT id, title, plan_json, grocery_json, created_at
            FROM meal_plans
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (user["id"], per_page, offset))
        rows = cur.fetchall()
        plans = []
        for r in rows:
            # Parse plan_json and grocery_json back to objects if possible
            plan_obj = None
            try:
                plan_obj = json.loads(r["plan_json"])
            except Exception:
                plan_obj = r["plan_json"]  # Fallback to raw string
            grocery_obj = None
            if r["grocery_json"]:
                try:
                    grocery_obj = json.loads(r["grocery_json"])
                except Exception:
                    grocery_obj = r["grocery_json"]  # Fallback to raw string
            plans.append({
                "id": r["id"],
                "title": r["title"],
                "plan": plan_obj,
                "grocery_list": grocery_obj,
                "created_at": r["created_at"]
            })

        return jsonify({
            "success": True,
            "page": page,
            "per_page": per_page,
            "total": total,
            "plans": plans
        })

    except Exception as e:
        logger.exception("List mealplans error")
        return jsonify({"error": str(e)}), 500

# Get a single meal plan by ID (protected)
@app.route("/mealplans/<int:plan_id>", methods=["GET"])
@token_required
def get_mealplan(plan_id):
    try:
        user = g.current_user
        conn = get_db()
        cur = conn.cursor()
        # Fetch the specific plan if it belongs to the user
        cur.execute("SELECT id, title, plan_json, grocery_json, created_at FROM meal_plans WHERE id = ? AND user_id = ?", (plan_id, user["id"]))
        r = cur.fetchone()
        if not r:
            return jsonify({"error": "plan not found"}), 404
        # Parse plan_json and grocery_json
        plan_obj = None
        try:
            plan_obj = json.loads(r["plan_json"])
        except Exception:
            plan_obj = r["plan_json"]
        grocery_obj = None
        if r["grocery_json"]:
            try:
                grocery_obj = json.loads(r["grocery_json"])
            except Exception:
                grocery_obj = r["grocery_json"]
        return jsonify({
            "success": True,
            "id": r["id"],
            "title": r["title"],
            "plan": plan_obj,
            "grocery_list": grocery_obj,
            "created_at": r["created_at"]
        })
    except Exception as e:
        logger.exception("Get mealplan error")
        return jsonify({"error": str(e)}), 500

# Delete a meal plan by ID (protected)
@app.route("/mealplans/<int:plan_id>", methods=["DELETE"])
@token_required
def delete_mealplan(plan_id):
    try:
        user = g.current_user
        conn = get_db()
        cur = conn.cursor()

        # Check if plan exists and belongs to the user
        cur.execute("SELECT id FROM meal_plans WHERE id = ? AND user_id = ?", (plan_id, user["id"]))
        r = cur.fetchone()
        if not r:
            return jsonify({"error": "plan not found"}), 404

        # Delete the plan
        cur.execute("DELETE FROM meal_plans WHERE id = ? AND user_id = ?", (plan_id, user["id"]))
        conn.commit()

        if cur.rowcount == 0:
            return jsonify({"error": "plan not found"}), 404

        return jsonify({
            "success": True,
            "message": "meal plan deleted successfully"
        })
    except Exception as e:
        logger.exception("Delete mealplan error")
        return jsonify({"error": str(e)}), 500

# Health check route: Verifies server status
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(MYT).isoformat() + "+08:00",  # Timestamp in MYT with offset
        "gemini_configured": bool(GEMINI_API_KEY)  # Indicate if AI is configured
    })

# Section 8: Run the Application
# Start the Flask server in development mode.
if __name__ == "__main__":
    # Only for development. In production, use a WSGI server like gunicorn.
    app.run(host="0.0.0.0", port=APP_PORT, debug=True)