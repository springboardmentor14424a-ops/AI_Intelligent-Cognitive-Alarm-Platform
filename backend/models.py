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
    - difficulty_level: Easy, Medium, Hard
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

    # Relationship to User
    user = relationship("User", back_populates="alarms")

    def __repr__(self):
        return f"<Alarm(id={self.id}, title='{self.title}', user_id={self.user_id}, time='{self.alarm_time}', type='{self.alarm_type}', active={self.is_active})>"

