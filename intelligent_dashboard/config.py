import os

class Config:
    PROJECT_NAME = "AI Intelligent Cognitive Alarm Platform"
    SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkeychangeinprod1234567890!")
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS = 7
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
    
    # OAuth Credentials
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "109823471092-cognitivealarm.apps.googleusercontent.com")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "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391823")
