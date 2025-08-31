# 🥗 Nutrietary - AI Dietary Planner

This repository contains the full-stack codebase for [Nutrietary](https://samhrld-collab.github.io/nutrietary_ai_dietary_planner/), an AI-powered dietary planner. The project is organized into two main parts: a backend API built with Flask and a frontend web application using Vite + React.js.

  * **`backend/`**: The Flask API that handles user authentication, data management, and AI integration.
  * **`frontend/`**: The Vite + React.js application that provides the user interface.

<img width="2940" height="1668" alt="nutrietary-home" src="https://github.com/user-attachments/assets/e67a2b29-76d3-4e61-a4bf-254b42716995" />

## ✨ Features

  * **User Management**: Secure user registration and login with JWT-based authentication.
  * **Personalized Preferences**: Users can store and update their dietary preferences, budget, and custom requirements.
  * **AI-Powered Meal Plans**: Generates multi-day meal plans and grocery lists using the Google Gemini 2.5 Flash model.
  * **Data Persistence**: All user data, including preferences and meal plans, are stored in a SQLite database.
  * **RESTful API**: A comprehensive set of endpoints for all application functionalities.
  * **Modern Frontend**: A responsive and dynamic user interface built with React.js.

## 🚀 Getting Started

To run the full application, you'll need to set up both the backend and frontend separately.

### Prerequisites

  * Node.js and npm (for the frontend)
  * Python 3.8+ (for the backend)
  * A Google Gemini API key

### Backend Setup

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```
2.  **Install Python dependencies**:
    ```bash
    pip install Flask Flask-Cors google-generativeai PyJWT Werkzeug pytz
    ```
3.  **Configure environment variables**:
    Create a `.env` file or set the following environment variables:
    ```
    PORT=5000
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    JWT_SECRET="aIbes4gYRkx-KRuAE8ryCZhx1T6FTXjjFApCPtjp5To"
    DB_PATH="nutrietary.db"
    ALLOWED_ORIGINS="http://localhost:5173" # Match your frontend URL
    ```
4.  **Run the backend server**:
    ```bash
    python app.py
    ```
    The API will be available at `http://localhost:5000`.

-----

### Frontend Setup

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```
2.  **Install Node.js dependencies**:
    ```bash
    npm install
    ```
3.  **Configure environment variables**:
    Create a `.env` file in the `frontend` root directory to point to your backend API.
    ```
    VITE_API_URL=http://localhost:5000
    ```
4.  **Run the frontend development server**:
    ```bash
    npm run dev
    ```
    The frontend application will be available at `http://localhost:5173`.

-----

## 📄 API Endpoints

All backend endpoints are hosted at the base URL (e.g., `http://localhost:5000`).

  * **`POST /register`**: Register a new user.
  * **`POST /login`**: Log in with credentials.
  * **`GET /me`**: Get user profile (protected).
  * **`PUT /preferences`**: Update user preferences (protected).
  * **`GET /preferences`**: Get user preferences (protected).
  * **`POST /generate_mealplan`**: Generate an AI-powered meal plan (protected).
  * **`GET /mealplans`**: List user's saved meal plans (protected).
  * **`GET /mealplans/<id>`**: Get a specific meal plan (protected).
  * **`DELETE /mealplans/<id>`**: Delete a meal plan (protected).
  * **`GET /health`**: Check server and AI status.

## 🛠️ Technology Stack

  * **Backend**: Flask, SQLite, JWT, Gemini 2.5 Flash API
  * **Frontend**: Vite, React.js, Tailwind CSS
  * **Database**: SQLite

## 🤝 Contribution

Contributions are welcome\! Please follow the standard fork-and-pull-request workflow.

-----

**License**: This project is licensed under the [MIT License](LICENSE).
