import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from config import Config

connect_args = {}
if Config.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    Config.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")  # administrator, coach, user
    provider = Column(String, default="local")  # local, google
    profile_image = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    country = Column(String, nullable=True)
    timezone = Column(String, default="UTC")
    account_status = Column(String, default="active")  # active, suspended, inactive
    email_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    login_attempts = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    alarms = relationship("Alarm", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    
    # Coach assignment relationship
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    coach = relationship("User", remote_side=[id], backref="assigned_users")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    wake_up_time = Column(String, default="07:00")  # HH:MM format
    sleep_time = Column(String, default="22:30")    # HH:MM format
    sleep_duration = Column(Float, default=8.0)     # Hours
    productivity_goal = Column(String, default="Stay Consistent")
    preferred_alarm_sound = Column(String, default="Chimes")
    challenge_preference = Column(String, default="Math Puzzle") 
    difficulty_level = Column(String, default="medium")        # easy, medium, hard
    notification_enabled = Column(Boolean, default=True)
    snooze_limit = Column(Integer, default=3)
    streak = Column(Integer, default=0)
    habit_score = Column(Integer, default=50) # 0 to 100
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")

class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alarm_name = Column(String, default="Alarm")
    alarm_time = Column(String, nullable=False)  # HH:MM format
    repeat_type = Column(String, default="once")  # once, daily, weekdays, weekends
    smart_alarm = Column(Boolean, default=False)
    volume = Column(Float, default=0.8)          # 0.0 to 1.0
    vibration = Column(Boolean, default=True)
    challenge_required = Column(String, default="None")
    alarm_status = Column(Boolean, default=True)  # Enabled/Disabled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="alarms")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Receiver ID
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info")  # info, alarm, coach, achievement, system
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="logs")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String, nullable=False)  # daily, weekly, monthly
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    average_sleep_duration = Column(Float, default=8.0)
    wake_up_consistency = Column(Float, default=100.0)
    challenge_completion_rate = Column(Float, default=100.0)
    alarms_missed = Column(Integer, default=0)
    alarms_snoozed = Column(Integer, default=0)
    habit_score = Column(Integer, default=50)
    recommendation_notes = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
