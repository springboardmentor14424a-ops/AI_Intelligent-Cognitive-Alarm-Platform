

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
    alarm_name = Column(String(100), nullable=False, default="Morning Alarm")
    alarm_time = Column(String(5), nullable=False)
    alarm_type = Column(String(30), default="Daily") # Daily, Weekday, Weekend, One-Time, Smart Adaptive
    repeat_type = Column(String(20), default="daily")
    repeat_days = Column(String(100), default="Mon,Tue,Wed,Thu,Fri,Sat,Sun")
    alarm_status = Column(Boolean, default=True)
    smart_alarm = Column(Boolean, default=False)
    challenge_required = Column(String(50), default="Math Puzzle")
    difficulty_level = Column(String(20), default="Medium") # Easy, Medium, Hard
    sound = Column(String(50), default="Chimes")
    vibration = Column(Boolean, default=True)
    snooze_count = Column(Integer, default=0)
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

def ensure_db_schema():
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "challenge_performances" in tables:
            columns = [c["name"] for c in inspector.get_columns("challenge_performances")]
            with engine.connect() as conn:
                if "score" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN score FLOAT DEFAULT 0.0"))
                if "is_correct" not in columns:
                    conn.execute(text("ALTER TABLE challenge_performances ADD COLUMN is_correct BOOLEAN DEFAULT 1"))
                
                # Backfill is_correct flag
                conn.execute(text("UPDATE challenge_performances SET is_correct = 1 WHERE status = 'success'"))
                conn.execute(text("UPDATE challenge_performances SET is_correct = 0 WHERE status != 'success'"))

                # Backfill score for all solved challenges with 0 score
                conn.execute(text("""
                    UPDATE challenge_performances 
                    SET score = ROUND(
                        CASE 
                            WHEN LOWER(difficulty) = 'easy' THEN 50.0
                            WHEN LOWER(difficulty) = 'hard' THEN 150.0
                            WHEN LOWER(difficulty) = 'beginner' THEN 30.0
                            WHEN LOWER(difficulty) = 'expert' THEN 200.0
                            ELSE 100.0
                        END * CASE WHEN accuracy > 0 THEN (accuracy / 100.0) ELSE 1.0 END, 1
                    )
                    WHERE (score IS NULL OR score = 0.0) AND (is_correct = 1 OR status = 'success')
                """))
                conn.commit()
    except Exception as e:
        print(f"Schema migration notice: {e}")

ensure_db_schema()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

