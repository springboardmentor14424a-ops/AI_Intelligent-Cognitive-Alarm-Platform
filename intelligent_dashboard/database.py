# ==============================================================================
# POSTGRESQL DATABASE & ORM SCHEMA MAPPING
# Primary Database Connection: PostgreSQL (postgresql://postgres:postgres@localhost:5432/postgres)
# Driver: psycopg2-binary
# Schema Alignment: Matches pgAdmin 4 Users table definition (id, name, email, password, role, provider)
# ==============================================================================

import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from config import Config

connect_args = {}
if Config.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

def create_app_engine():
    db_url = Config.DATABASE_URL
    try:
        eng = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
        with eng.connect() as conn:
            pass
        print(f"Successfully connected to primary database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        return eng
    except Exception as e:
        print(f"Primary PostgreSQL connection notice ({e}). Using local database engine fallback.")
        return create_engine("sqlite:///./alarm_platform.db", connect_args={"check_same_thread": False}, pool_pre_ping=True)

engine = create_app_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="user") # user, coach, administrator
    provider = Column(String(20), default="LOCAL") # LOCAL, GOOGLE
    
    phone = Column(String(20), nullable=True)
    profile_image = Column(String(255), nullable=True)
    account_status = Column(String(20), default="active")
    email_verified = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Property Aliases for full application compatibility
    @property
    def full_name(self):
        return self.name

    @full_name.setter
    def full_name(self, value):
        self.name = value if value else "User"

    @property
    def username(self):
        if self.email and "@" in self.email:
            return self.email.split("@")[0]
        return self.name

    @username.setter
    def username(self, value):
        pass

    @property
    def password_hash(self):
        return self.password

    @password_hash.setter
    def password_hash(self, value):
        self.password = value

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    alarms = relationship("Alarm", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    
    # Coach assignment
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    coach = relationship("User", remote_side=[id], backref="assigned_users")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    wake_up_time = Column(String(5), default="07:00")
    sleep_time = Column(String(5), default="22:30")
    sleep_duration = Column(Float, default=8.0)
    productivity_goal = Column(String, nullable=True)
    streak = Column(Integer, default=0)
    habit_score = Column(Integer, default=50)
    challenge_preference = Column(String(50), default="Math Puzzle")

    user = relationship("User", back_populates="profile")

class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alarm_name = Column(String(100), nullable=False)
    alarm_time = Column(String(5), nullable=False)
    repeat_type = Column(String(20), default="daily")
    alarm_status = Column(Boolean, default=True)
    smart_alarm = Column(Boolean, default=False)
    challenge_required = Column(String(50), default="Math Puzzle")
    vibration = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="alarms")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(String, nullable=False)
    type = Column(String(30), default="info")
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="logs")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(30), nullable=False)
    file_path = Column(String(255), nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
