"""
Database connection setup.
Uses SQLite for zero-config local development.
Swap SQLALCHEMY_DATABASE_URL for a PostgreSQL URL later (matches the PDF's
"Primary Database: PostgreSQL" spec) without touching any other file.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./alarm_platform.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
