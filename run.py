"""
HBS Sentinel — Root-level launcher.
Adds the backend directory to sys.path so bare imports work,
then starts the FastAPI app with uvicorn.
"""
import sys
import os

# Add backend directory to path so 'from database import db' etc. work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
