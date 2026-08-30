import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

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

    # AI Provider API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODELS: str = os.getenv("GROQ_MODELS", "openai/gpt-oss-20b,qwen/qwen3-32b")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto") # auto, groq, gemini, local

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
