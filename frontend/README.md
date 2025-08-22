# Overview

Nutrietary is a nutrition tracking and analysis application that combines food logging with AI-powered dietary insights. The application allows users to track their meals and receive personalized nutritional guidance through Google's Gemini AI integration. It features user authentication, meal logging, and intelligent analysis of dietary patterns with support for custom user preferences.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Backend Framework
- **Flask-based REST API**: Chosen for its simplicity and flexibility in building lightweight web services
- **CORS enabled**: Supports cross-origin requests for frontend-backend separation
- **Environment-based configuration**: Uses environment variables for API keys, database paths, and security settings

## Authentication & Security
- **JWT token-based authentication**: Stateless authentication using JSON Web Tokens with HS256 algorithm
- **Password hashing**: Uses Werkzeug's security utilities for secure password storage
- **Decorator-based route protection**: Implements authentication middleware for protected endpoints

## Data Storage
- **SQLite database**: Lightweight, file-based database suitable for single-user applications or small-scale deployments
- **Row factory configuration**: Enables dictionary-like access to database records
- **Flask.g connection management**: Reuses database connections within request context for efficiency

## AI Integration
- **Google Gemini AI**: Integrated for intelligent nutritional analysis and dietary recommendations
- **Gemini 2.0 Flash Exp model**: Latest experimental model for enhanced performance
- **Conditional AI loading**: Gracefully handles missing API keys without breaking core functionality

## Time Zone Support
- **Malaysia Time Zone (MYT)**: Built-in support for Asia/Kuala_Lumpur timezone using pytz
- **Timezone-aware datetime handling**: Ensures consistent time tracking across different deployment environments

## Configuration Management
- **Environment variable driven**: All sensitive data and configuration options externalized
- **Flexible deployment options**: Configurable port, database path, and CORS origins
- **Custom preferences system**: Built-in support for user-specific dietary preferences with length validation

# External Dependencies

## Core Framework Dependencies
- **Flask**: Web framework for API development
- **Flask-CORS**: Cross-origin resource sharing support
- **Werkzeug**: Security utilities for password hashing
- **Gunicorn**: WSGI HTTP server for production deployment

## AI & Authentication
- **Google Generative AI**: Google's Gemini AI for nutritional analysis and recommendations
- **PyJWT**: JSON Web Token implementation for secure authentication

## Utilities
- **pytz**: Timezone support for accurate time tracking across regions

## Database
- **SQLite3**: Built-in Python database support (no external database server required)

## Environment Requirements
- **GEMINI_API_KEY**: Google AI API key for Gemini integration
- **JWT_SECRET**: Secret key for JWT token signing and verification
- **DB_PATH**: Configurable database file location
- **ALLOWED_ORIGINS**: CORS configuration for frontend domains
- **PORT**: Configurable application port (defaults to 5000)
