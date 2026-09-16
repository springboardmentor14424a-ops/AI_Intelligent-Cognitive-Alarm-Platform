

import os
import sys
import datetime
import tempfile
import shutil

_api_dir = os.path.dirname(os.path.abspath(__file__))
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Float, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from config import Config

connect_args = {}
if Config.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

is_vercel = os.environ.get("VERCEL") == "1" or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None

def create_app_engine():
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # In Vercel serverless without cloud DB, skip unreachable localhost postgres immediately
    if db_url and not (is_vercel and ("localhost" in db_url or "127.0.0.1" in db_url)):
        try:
            eng = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
            with eng.connect() as conn:
                pass
            print(f"Successfully connected to primary database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
            return eng
        except Exception as e:
            print(f"Primary database connection notice ({e}). Using local database engine fallback.")

    # On serverless (Vercel Lambda), root is read-only, so use the system temp directory
    if is_vercel:
        db_file = os.path.join(tempfile.gettempdir(), "alarm_platform.db").replace("\\", "/")
        if not os.path.exists(db_file):
            for candidate in [
                os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "alarm_platform.db"),
                os.path.join(os.path.dirname(os.path.abspath(__file__)), "alarm_platform.db"),
                "alarm_platform.db"
            ]:
                if os.path.exists(candidate):
                    try:
                        shutil.copy2(candidate, db_file)
                        print(f"Copied bundled database from {candidate} to {db_file}")
                        break
                    except Exception as e:
                        print(f"Could not copy bundled database: {e}")
    else:
        db_file = "./alarm_platform.db"

    local_eng = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False, "timeout": 30.0},
        pool_pre_ping=True
    )
    try:
        from sqlalchemy import text
        with local_eng.connect() as conn:
            if is_vercel:
                conn.execute(text("PRAGMA journal_mode=MEMORY;"))
                conn.execute(text("PRAGMA synchronous=OFF;"))
            else:
                conn.execute(text("PRAGMA journal_mode=WAL;"))
                conn.execute(text("PRAGMA synchronous=NORMAL;"))
                conn.execute(text("PRAGMA busy_timeout=30000;"))
    except Exception:
        pass
    return local_eng

engine = create_app_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="user") 
    provider = Column(String(20), default="LOCAL")
    
    phone = Column(String(20), nullable=True)
    profile_image = Column(String(255), nullable=True)
    account_status = Column(String(20), default="active")
    email_verified = Column(Boolean, default=True)
    fcm_token = Column(String(255), nullable=True)  # Firebase Cloud Messaging device token
    
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
    confirmations = relationship("WakeUpConfirmation", back_populates="user", cascade="all, delete-orphan")
    habit_score_logs = relationship("HabitScoreLog", back_populates="user", cascade="all, delete-orphan")
    wake_logs = relationship("WakeLog", back_populates="user", cascade="all, delete-orphan")
    sleep_adherence_logs = relationship("SleepAdherenceLog", back_populates="user", cascade="all, delete-orphan")
    
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
    difficulty_level = Column(String(20), default="medium")
    preferred_alarm_sound = Column(String(50), default="Chimes")
    time_zone = Column(String(50), default="UTC")

    # Weighted Habit Subscores (35% WakeUp, 25% Challenge, 20% Snooze, 20% Sleep)
    wake_up_consistency_score = Column(Float, default=70.0)
    challenge_completion_score = Column(Float, default=75.0)
    snooze_reduction_score = Column(Float, default=80.0)
    sleep_schedule_adherence_score = Column(Float, default=70.0)
    productivity_score = Column(Float, default=75.0)
    
    # Workflows
    anti_snooze_enabled = Column(Boolean, default=True)
    wake_confirmation_enabled = Column(Boolean, default=True)

    user = relationship("User", back_populates="profile")

class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alarm_name = Column(String(100), nullable=False, default="Morning Alarm")
    alarm_time = Column(String(5), nullable=False)
    alarm_type = Column(String(30), default="Daily") # Daily, Weekday, Weekend, One-Time, Smart Adaptive
    repeat_type = Column(String(20), default="daily")
    repeat_days = Column(String(100), default="Mon,Tue,Wed,Thu,Fri,Sat,Sun")
    alarm_status = Column(Boolean, default=True)
    smart_alarm = Column(Boolean, default=False)
    challenge_required = Column(String(50), default="Math Puzzle")
    difficulty_level = Column(String(20), default="Medium") # Beginner, Easy, Medium, Hard, Expert
    sound = Column(String(50), default="Chimes")
    vibration = Column(Boolean, default=True)
    snooze_count = Column(Integer, default=0)
    snooze_limit = Column(Integer, default=3)
    
    # Verification Method & Multi-Step Options
    verification_method = Column(String(50), default="Puzzle Completion") # Puzzle Completion, Multi-Step Challenges, Consecutive Correct Answers, Time-Based Challenges, Cognitive Accuracy Checks
    multi_step_count = Column(Integer, default=2)
    consecutive_target = Column(Integer, default=3)
    time_limit_sec = Column(Integer, default=30)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Property Aliases for Alarm Schema Compatibility
    @property
    def title(self):
        return self.alarm_name

    @title.setter
    def title(self, value):
        self.alarm_name = value if value else "Morning Alarm"

    @property
    def is_active(self):
        return self.alarm_status

    @is_active.setter
    def is_active(self, value):
        self.alarm_status = bool(value)

    user = relationship("User", back_populates="alarms")

class WakeUpConfirmation(Base):
    __tablename__ = "wake_up_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alarm_id = Column(Integer, ForeignKey("alarms.id", ondelete="SET NULL"), nullable=True)
    confirmed = Column(Boolean, default=True) # Yes / No response
    confirmed_at = Column(DateTime, default=datetime.datetime.utcnow)
    wakefulness_level = Column(String(50), default="Fully awake") # Slightly awake, Half awake, Fully awake
    wakefulness_rating = Column(Float, default=5.0) # 1 - 5 scale
    wakefulness_score = Column(Float, default=8.0) # 1.0 - 10.0 assessment
    assessment_status = Column(String(30), default="confirmed") # fully_awake, mild_inertia, groggy, confirmed
    verification_method = Column(String(50), default="Puzzle Completion")
    response_time_sec = Column(Float, default=0.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="confirmations")
    alarm = relationship("Alarm", backref="confirmations")

class HabitScoreLog(Base):
    __tablename__ = "habit_score_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    habit_score = Column(Float, nullable=False, default=50.0)
    wake_up_consistency = Column(Float, default=70.0)   # 35% weight
    challenge_completion = Column(Float, default=75.0)  # 25% weight
    snooze_reduction = Column(Float, default=80.0)      # 20% weight
    sleep_schedule_adherence = Column(Float, default=70.0) # 20% weight
    productivity_score = Column(Float, default=75.0)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="habit_score_logs")

class WakeLog(Base):
    __tablename__ = "wake_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alarm_id = Column(Integer, ForeignKey("alarms.id", ondelete="SET NULL"), nullable=True)
    scheduled_time = Column(String(5), nullable=False)
    actual_wake_time = Column(String(5), nullable=False)
    drift_minutes = Column(Float, default=0.0)
    snooze_count = Column(Integer, default=0)
    dismissal_status = Column(String(30), default="verified_dismissal") # verified_dismissal, snoozed, missed
    wakefulness_rating = Column(Float, default=8.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="wake_logs")
    alarm = relationship("Alarm", backref="wake_logs")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(150), nullable=False)
    content = Column(Text, nullable=False)
    target_role = Column(String(30), default="all") # all, user, coach
    priority = Column(String(20), default="normal") # normal, high, urgent
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    admin = relationship("User", backref="announcements")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(String, nullable=False)
    type = Column(String(30), default="info") # alarm, reminder, bedtime, habit, progress, coach, announcement, verification
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

class ChallengePerformance(Base):
    __tablename__ = "challenge_performances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alarm_id = Column(Integer, ForeignKey("alarms.id", ondelete="SET NULL"), nullable=True)
    challenge_type = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False)
    accuracy = Column(Float, nullable=False)
    time_taken = Column(Float, nullable=False)
    failed_attempts = Column(Integer, default=0)
    status = Column(String(20), nullable=False)
    score = Column(Float, default=0.0)
    is_correct = Column(Boolean, default=True)
    
    # Verification & Behavioral Extensions
    verification_method = Column(String(50), default="Puzzle Completion")
    step_index = Column(Integer, default=1)
    total_steps = Column(Integer, default=1)
    consecutive_count = Column(Integer, default=1)
    wakefulness_score = Column(Float, default=8.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", backref="performances")
    alarm = relationship("Alarm", backref="performances")

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False, default=5) # 1 to 5 stars
    category = Column(String(50), default="general") # alarm, challenge, ui, performance, general
    comment = Column(String, nullable=False)
    status = Column(String(20), default="new") # new, reviewed, resolved
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", backref="feedbacks")

class SleepAdherenceLog(Base):
    __tablename__ = "sleep_adherence_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    adhered = Column(Boolean, default=True)  # True = Yes, False = No
    target_bedtime = Column(String(5), default="22:30")
    target_wake_time = Column(String(5), default="07:00")
    score = Column(Float, default=95.0)  # e.g. 95.0 for Yes, 45.0 for No
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sleep_adherence_logs")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String(100), nullable=False)
    coach_name = Column(String(100), default="Wellness Coach")
    appointment_time = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="Scheduled") # Scheduled, Confirmed, Completed, Cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], backref="user_appointments")
    coach = relationship("User", foreign_keys=[coach_id], backref="coach_appointments")

def ensure_db_schema():
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Migrate challenge_performances
        if "challenge_performances" in tables:
            columns = [c["name"] for c in inspector.get_columns("challenge_performances")]
            with engine.connect() as conn:
                if "score" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN score FLOAT DEFAULT 0.0"))
                if "is_correct" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN is_correct BOOLEAN DEFAULT 1"))
                if "verification_method" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN verification_method VARCHAR(50) DEFAULT 'Puzzle Completion'"))
                if "step_index" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN step_index INTEGER DEFAULT 1"))
                if "total_steps" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN total_steps INTEGER DEFAULT 1"))
                if "consecutive_count" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN consecutive_count INTEGER DEFAULT 1"))
                if "wakefulness_score" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN wakefulness_score FLOAT DEFAULT 8.0"))
                
                # Backfill is_correct flag
                conn.execute(text("UPDATE challenge_performances SET is_correct = 1 WHERE status = 'success'"))
                conn.execute(text("UPDATE challenge_performances SET is_correct = 0 WHERE status != 'success'"))
                conn.commit()

        # Migrate alarms
        if "alarms" in tables:
            columns = [c["name"] for c in inspector.get_columns("alarms")]
            with engine.connect() as conn:
                if "snooze_limit" not in columns:
                    conn.execute(text("ALTER TABLE alarms ADD COLUMN snooze_limit INTEGER DEFAULT 3"))
                if "verification_method" not in columns:
                    conn.execute(text("ALTER TABLE alarms ADD COLUMN verification_method VARCHAR(50) DEFAULT 'Puzzle Completion'"))
                if "multi_step_count" not in columns:
                    conn.execute(text("ALTER TABLE alarms ADD COLUMN multi_step_count INTEGER DEFAULT 2"))
                if "consecutive_target" not in columns:
                    conn.execute(text("ALTER TABLE alarms ADD COLUMN consecutive_target INTEGER DEFAULT 3"))
                if "time_limit_sec" not in columns:
                    conn.execute(text("ALTER TABLE alarms ADD COLUMN time_limit_sec INTEGER DEFAULT 30"))
                conn.commit()

        # Migrate user_profiles
        if "user_profiles" in tables:
            columns = [c["name"] for c in inspector.get_columns("user_profiles")]
            with engine.connect() as conn:
                if "difficulty_level" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN difficulty_level VARCHAR(20) DEFAULT 'medium'"))
                if "challenge_preference" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN challenge_preference VARCHAR(50) DEFAULT 'Math Puzzle'"))
                if "wake_up_consistency_score" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN wake_up_consistency_score FLOAT DEFAULT 70.0"))
                if "challenge_completion_score" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN challenge_completion_score FLOAT DEFAULT 75.0"))
                if "snooze_reduction_score" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN snooze_reduction_score FLOAT DEFAULT 80.0"))
                if "sleep_schedule_adherence_score" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN sleep_schedule_adherence_score FLOAT DEFAULT 70.0"))
                if "productivity_score" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN productivity_score FLOAT DEFAULT 75.0"))
                if "anti_snooze_enabled" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN anti_snooze_enabled BOOLEAN DEFAULT 1"))
                if "wake_confirmation_enabled" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN wake_confirmation_enabled BOOLEAN DEFAULT 1"))
                if "preferred_alarm_sound" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN preferred_alarm_sound VARCHAR(50) DEFAULT 'Chimes'"))
                if "time_zone" not in columns:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC'"))
                conn.commit()

        # Migrate wake_up_confirmations
        if "wake_up_confirmations" in tables:
            columns = [c["name"] for c in inspector.get_columns("wake_up_confirmations")]
            with engine.connect() as conn:
                if "confirmed" not in columns:
                    conn.execute(text("ALTER TABLE wake_up_confirmations ADD COLUMN confirmed BOOLEAN DEFAULT 1"))
                if "wakefulness_level" not in columns:
                    conn.execute(text("ALTER TABLE wake_up_confirmations ADD COLUMN wakefulness_level VARCHAR(50) DEFAULT 'Fully awake'"))
                if "wakefulness_rating" not in columns:
                    conn.execute(text("ALTER TABLE wake_up_confirmations ADD COLUMN wakefulness_rating FLOAT DEFAULT 5.0"))
                if "response_time_sec" not in columns:
                    conn.execute(text("ALTER TABLE wake_up_confirmations ADD COLUMN response_time_sec FLOAT DEFAULT 0.0"))
                conn.commit()

    except Exception as e:
        print(f"Schema migration notice: {e}")

try:
    ensure_db_schema()
except Exception as e:
    print(f"ensure_db_schema notice: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

