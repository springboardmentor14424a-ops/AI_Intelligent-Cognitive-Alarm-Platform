"""
Core data models — maps to PDF section 4 (Modules to be Implemented):
  1. User Authentication & Role-Based Access -> User
  3. Alarm Scheduling System -> Alarm
  4/6. Cognitive Challenge Engine + Wake-Up Verification -> ChallengeAttempt
  8. Habit Scoring Engine -> HabitScore (computed, stored as snapshot)
"""
import datetime
import enum

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum
)
from sqlalchemy.orm import relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    user = "user"
    wellness_coach = "wellness_coach"
    admin = "admin"


class DifficultyEnum(str, enum.Enum):
    beginner = "beginner"
    easy = "easy"
    medium = "medium"
    hard = "hard"
    expert = "expert"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.user, nullable=False)

    # User Information (PDF section 2)
    preferred_wake_time = Column(String, default="07:00")
    difficulty_preference = Column(Enum(DifficultyEnum), default=DifficultyEnum.easy)
    timezone = Column(String, default="Asia/Kolkata")

    # Extra alarm-app style preferences (Profile Settings page)
    target_sleep_time = Column(String, default="22:30")  # "HH:MM" bedtime target
    sleep_duration_hours = Column(Float, default=8.0)
    challenge_type_preference = Column(String, default="math")  # math/logic/memory/riddle
    snooze_duration_minutes = Column(Integer, default=5)
    max_snoozes = Column(Integer, default=3)
    ringtone = Column(String, default="classic_bell")
    vibration_enabled = Column(Boolean, default=True)
    gradual_volume = Column(Boolean, default=False)
    theme = Column(String, default="dark")
    phone = Column(String, default="")
    avatar_emoji = Column(String, default="⏰")
    is_demo = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    alarms = relationship("Alarm", back_populates="owner", cascade="all, delete-orphan")
    attempts = relationship("ChallengeAttempt", back_populates="user", cascade="all, delete-orphan")


class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    label = Column(String, default="Alarm")
    time = Column(String, nullable=False)  # "HH:MM" 24h
    repeat_days = Column(String, default="")  # e.g. "Mon,Tue,Wed" or "" for one-time
    is_active = Column(Boolean, default=True)
    difficulty = Column(Enum(DifficultyEnum), default=DifficultyEnum.easy)
    challenge_type = Column(String, default="math")  # math/logic/memory/riddle
    ringtone = Column(String, default="classic_bell")
    multi_step_count = Column(Integer, default=1)  # how many challenges must be solved to disarm
    verification_method = Column(String, default="puzzle_completion")
    # puzzle_completion: solve one challenge | multi_step: solve N in sequence (retries same step on miss)
    # consecutive_streak: must get N CORRECT IN A ROW, one miss resets the streak | timed_blitz: shorter 20s timer
    vibration_enabled = Column(Boolean, default=True)
    smart_gradient = Column(Boolean, default=False)  # cosmetic: card gets a gradient highlight
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="alarms")


class ChallengeAttempt(Base):
    """Records every cognitive challenge served to verify a wake-up (PDF section 6)."""
    __tablename__ = "challenge_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alarm_id = Column(Integer, ForeignKey("alarms.id"), nullable=True)
    challenge_type = Column(String, nullable=False)  # math, logic, memory, riddle
    difficulty = Column(Enum(DifficultyEnum), default=DifficultyEnum.easy)
    was_correct = Column(Boolean, default=False)
    snoozed = Column(Boolean, default=False)
    response_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="attempts")


class Feedback(Base):
    """Platform Feedback panel on the Overview page."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, default=5)
    comment = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class CheckIn(Base):
    """Post-Wake Confirmation Check-in: a quick self-reported alertness log."""
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alertness_rating = Column(Integer, default=5)  # 1-10, self-reported
    notes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
