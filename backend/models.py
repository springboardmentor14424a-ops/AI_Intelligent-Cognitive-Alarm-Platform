import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    """
    User Model matching PostgreSQL table design:
    - id: Primary Key
    - name: User Name
    - email: Unique Email
    - password: Encrypted Password (BCrypt)
    - role: USER / Wellness Coach / Administrator
    - provider: LOCAL or GOOGLE
    - created_at: Creation Timestamp
    - updated_at: Update Timestamp
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="USER")
    provider = Column(String(50), nullable=False, default="LOCAL")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship to Alarms
    alarms = relationship("Alarm", back_populates="user", cascade="all, delete-orphan")
    challenge_attempts = relationship("ChallengeAttempt", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}', role='{self.role}')>"

class Alarm(Base):
    """
    Alarm Model:
    - id: Primary Key
    - user_id: Foreign Key to User
    - title: Alarm Name
    - alarm_time: Trigger Time (24H format, e.g., "07:30")
    - alarm_type: Daily, Weekday, Weekend, One-Time, Smart Adaptive
    - repeat_days: Comma-separated repeating days (e.g. "Mon,Tue,Wed")
    - is_active: Enabled/Disabled state
    - difficulty_level: Beginner, Easy, Medium, Difficult, Advanced
    - sound: Alarm tone name
    - vibration: Vibration pattern
    - snooze_duration: Snooze duration in minutes
    - created_at: Timestamp of creation
    - updated_at: Timestamp of update
    """
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    alarm_time = Column(String(50), nullable=False)
    alarm_type = Column(String(50), nullable=False, default="One-Time")
    repeat_days = Column(String(100), nullable=False, default="")
    is_active = Column(Boolean, nullable=False, default=True)
    challenge = Column(String(50), nullable=False, default="None")
    difficulty_level = Column(String(50), nullable=False, default="Medium")
    sound = Column(String(100), nullable=False, default="Radar")
    vibration = Column(String(50), nullable=False, default="Standard")
    snooze_duration = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="alarms")
    challenge_attempts = relationship("ChallengeAttempt", back_populates="alarm", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Alarm(id={self.id}, title='{self.title}', user_id={self.user_id}, time='{self.alarm_time}', type='{self.alarm_type}', active={self.is_active})>"

class ChallengeAttempt(Base):
    """
    Challenge Attempt Model:
    Logs every user challenge interaction, validation result, and timer stats.
    - id: Primary Key
    - user_id: Foreign Key to User
    - alarm_id: Foreign Key to Alarm (nullable if standalone challenge)
    - challenge_type: Math Problems, Logic Puzzles, etc.
    - difficulty: Beginner, Easy, Medium, Difficult, Advanced
    - question: Challenge text/question
    - correct_answer: Expected answer
    - user_answer: User submitted answer
    - is_correct: True if correct, False if wrong/timeout
    - attempt_number: 1, 2, 3...
    - time_taken: Seconds taken to respond
    - time_limit: Configured time limit (40s, 30s, 20s, 15s, 10s)
    - created_at: Creation Timestamp
    """
    __tablename__ = "challenge_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alarm_id = Column(Integer, ForeignKey("alarms.id", ondelete="SET NULL"), nullable=True, index=True)
    challenge_type = Column(String(100), nullable=False)
    difficulty = Column(String(50), nullable=False)
    question = Column(String(500), nullable=False)
    correct_answer = Column(String(255), nullable=False)
    user_answer = Column(String(255), nullable=False, default="")
    is_correct = Column(Boolean, nullable=False, default=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    time_taken = Column(Integer, nullable=False, default=0) # Float/Integer seconds
    time_limit = Column(Integer, nullable=False, default=20)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="challenge_attempts")
    alarm = relationship("Alarm", back_populates="challenge_attempts")

    def __repr__(self):
        return f"<ChallengeAttempt(id={self.id}, user_id={self.user_id}, type='{self.challenge_type}', difficulty='{self.difficulty}', correct={self.is_correct})>"


