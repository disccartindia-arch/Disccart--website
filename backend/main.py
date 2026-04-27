"""
DISCCART Backend - Production Entry Point
This file is the entry point for Render deployment.
"""
from server import app

# Render uses this: uvicorn main:app --host 0.0.0.0 --port $PORT
