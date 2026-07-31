import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

def create_db_engine(database_url: str):
    """
    Tries PostgreSQL connection first. If PostgreSQL password authentication or connection fails,
    gracefully falls back to SQLite so the server and database stay 100% operational.
    """
    try:
        if database_url.startswith("sqlite"):
            return create_engine(database_url, connect_args={"check_same_thread": False})

        eng = create_engine(
            database_url,
            connect_args={"connect_timeout": 5},
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        # Test connection immediately
        with eng.connect() as conn:
            pass
        logger.info("Successfully connected to PostgreSQL Database.")
        return eng
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite database (sqlite:///./ai_alarm.db).")
        print("\n--------------------------------------------------------------------------------")
        print("[NOTICE] PostgreSQL Connection Failed. Using local SQLite database (sqlite:///./ai_alarm.db).")
        print("[TIP] To use PostgreSQL, verify your password in backend/.env")
        print("--------------------------------------------------------------------------------\n")
        return create_engine("sqlite:///./ai_alarm.db", connect_args={"check_same_thread": False})

engine = create_db_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    FastAPI dependency yielding database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
