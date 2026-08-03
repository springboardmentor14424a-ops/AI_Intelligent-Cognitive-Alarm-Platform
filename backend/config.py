import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AI Alarm Platform API"
    DEBUG: bool = True
    
    # PostgreSQL Connection String
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/ai_alarm_db"
    )
    
    # JWT & Password Hashing Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-this-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 Hours
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "1234567890-demo.apps.googleusercontent.com")
    
    ALLOWED_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
