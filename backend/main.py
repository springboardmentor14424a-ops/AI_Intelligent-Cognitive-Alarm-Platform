import math
import hashlib
import io
import os
import re
import secrets
import smtplib
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone
from email.message import EmailMessage
from enum import Enum
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.background import BackgroundScheduler
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text as SQLText, Time, UniqueConstraint, create_engine, func, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

try:
    from .alarm_service import next_occurrence
    from .gemini_service import get_gemini_service
    from .fcm_service import get_fcm_service
except ImportError:  # Supports `uvicorn main:app` when running from backend/.
    from alarm_service import next_occurrence
    from gemini_service import get_gemini_service
    from fcm_service import get_fcm_service

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/brainos")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-before-production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SESSION_SECRET = os.getenv("SESSION_SECRET", JWT_SECRET)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
USE_GEMINI_CHALLENGES = os.getenv("USE_GEMINI_CHALLENGES", "true").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USERNAME)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
ADMIN_BOOTSTRAP_EMAILS = {
    email.strip().lower() for email in os.getenv("ADMIN_BOOTSTRAP_EMAILS", "").split(",") if email.strip()
}
RESET_CODE_TTL_MINUTES = 10
RESET_RESEND_COOLDOWN_SECONDS = 60
RESET_MAX_ATTEMPTS = 5
ALGORITHM, EXPIRE_MINUTES = "HS256", 60 * 24

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
oauth = OAuth()
oauth.register(
    "google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

app = FastAPI(title="BrainOS API")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler(timezone="UTC")

class Base(DeclarativeBase):
    pass

class Role(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    WELLNESS_COACH = "WELLNESS_COACH"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(30), default=Role.USER.value)
    provider: Mapped[str] = mapped_column(String(30), default="LOCAL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class UserProfile(Base):
    """One preference record per user, kept separate to avoid breaking existing users."""

    __tablename__ = "user_profiles"

    profile_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    preferred_wake_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    target_sleep_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True, default=480)
    productivity_goal: Mapped[str | None] = mapped_column(String(255), nullable=True)
    difficulty_preference: Mapped[str] = mapped_column(String(30), default="MEDIUM")
    habit_preferences: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class Alarm(Base):
    __tablename__ = "alarms"

    alarm_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    alarm_time: Mapped[time] = mapped_column(Time)
    repeat_days: Mapped[str | None] = mapped_column(String(100), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(30), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    title: Mapped[str] = mapped_column(String(120), default="Wake mission")
    alarm_type: Mapped[str] = mapped_column(String(30), default="DAILY")
    sound: Mapped[str] = mapped_column(String(80), default="Neural Dawn")
    vibration: Mapped[bool] = mapped_column(Boolean, default=True)
    snooze_minutes: Mapped[int] = mapped_column(Integer, default=5)
    daybreak_route_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    wake_window_minutes: Mapped[int] = mapped_column(Integer, default=15)
    challenge_type: Mapped[str] = mapped_column(String(30), default="AUTO")
    wake_verification_mode: Mapped[str] = mapped_column(String(30), default="SINGLE")
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SnoozeEvent(Base):
    """Immutable record of an accepted snooze action for behavioral analytics."""

    __tablename__ = "snooze_events"

    snooze_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    alarm_id: Mapped[int] = mapped_column(ForeignKey("alarms.alarm_id", ondelete="CASCADE"), index=True)
    snooze_minutes: Mapped[int] = mapped_column(Integer)
    snoozed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class Mission(Base):
    __tablename__ = "missions"

    mission_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    challenge_type: Mapped[str] = mapped_column(String(40))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reward: Mapped[int] = mapped_column(Integer, default=180)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

class ChallengeAttempt(Base):
    """Server-side challenge state. The expected answer never leaves this table."""

    __tablename__ = "challenge_attempts"

    challenge_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    alarm_id: Mapped[int | None] = mapped_column(
        ForeignKey("alarms.alarm_id", ondelete="SET NULL"), nullable=True, index=True
    )
    challenge_type: Mapped[str] = mapped_column(String(40))
    difficulty: Mapped[str] = mapped_column(String(30))
    intent: Mapped[str] = mapped_column(String(60))
    prompt: Mapped[str] = mapped_column(SQLText)
    expected_answer: Mapped[str] = mapped_column(String(255))
    # Safe multiple-choice options; the expected answer itself is never exposed separately.
    options: Mapped[list[str]] = mapped_column(JSON, default=list)
    submitted_answer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", index=True)
    max_attempts: Mapped[int] = mapped_column(Integer, default=2)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=75)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    verification_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    elapsed_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SleepLog(Base):

    __tablename__ = "sleep_logs"

    sleep_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    sleep_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    wake_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    quality: Mapped[float] = mapped_column(Float)


class Analytics(Base):
    __tablename__ = "analytics"

    analytics_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    focus_score: Mapped[int] = mapped_column(Integer, default=74)
    habit_score: Mapped[int] = mapped_column(Integer, default=68)
    sleep_score: Mapped[int] = mapped_column(Integer, default=72)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    notification_type: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(SQLText)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class DeviceToken(Base):
    """FCM push registration token for a user's browser/device."""

    __tablename__ = "device_tokens"

    device_token_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(20), default="WEB")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CoachNote(Base):
    """A private note a coach keeps about a member's progress."""

    __tablename__ = "coach_notes"

    note_id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note: Mapped[str] = mapped_column(SQLText)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class CoachAssignment(Base):
    """Links a wellness coach to the members they are responsible for."""

    __tablename__ = "coach_assignments"
    __table_args__ = (UniqueConstraint("coach_id", "member_id", name="uq_coach_assignment"),)

    assignment_id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CoachHelpMessage(Base):
    """A single turn in the two-way help thread between a member and their assigned coach."""

    __tablename__ = "coach_help_messages"

    message_id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    sender_role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(SQLText)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class AssistantMessage(Base):
    """A single turn in a user's ongoing conversation with the Gemini morning coach."""

    __tablename__ = "assistant_messages"

    message_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(SQLText)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"

    reset_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


class AlarmInput(BaseModel):
    title: str = Field(default="Wake mission", min_length=1, max_length=120)
    alarm_time: str
    alarm_type: str = "DAILY"
    repeat_days: str | None = None
    difficulty: str = "MEDIUM"
    sound: str = Field(default="Neural Dawn", max_length=80)
    vibration: bool = True
    snooze_minutes: int = Field(default=5, ge=0, le=30)
    status: str = "ACTIVE"
    daybreak_route_enabled: bool = True
    wake_window_minutes: int = Field(default=15, ge=0, le=60)
    challenge_type: str = Field(default="AUTO", min_length=2, max_length=30)
    wake_verification_mode: str = Field(default="SINGLE", min_length=3, max_length=30)
    notification_enabled: bool = True


class MissionInput(BaseModel):
    challenge_type: str = Field(min_length=2, max_length=40)
    reward: int = Field(default=180, ge=0, le=500)


class SleepInput(BaseModel):
    sleep_time: datetime
    wake_time: datetime
    quality: float = Field(ge=0, le=100)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    preferred_wake_time: str | None = Field(default=None, max_length=8)
    target_sleep_duration_minutes: int | None = Field(default=None, ge=60, le=960)
    productivity_goal: str | None = Field(default=None, max_length=255)
    difficulty_preference: str | None = Field(default=None, max_length=30)
    habit_preferences: list[str] | None = Field(default=None, max_length=20)


class RoleUpdateInput(BaseModel):
    role: Role


class CoachAssignmentInput(BaseModel):
    member_id: int


class ChallengeGenerateInput(BaseModel):
    # Omit this (or use AUTO) to get a server-selected challenge type.
    challenge_type: str | None = Field(default=None, min_length=2, max_length=40)
    type: str | None = Field(default=None, min_length=2, max_length=40)
    difficulty: str | None = Field(default=None, min_length=3, max_length=30)
    intent: str = Field(default="WAKE_UP", min_length=2, max_length=60)
    alarm_id: int | None = Field(default=None, ge=1)


class AssistantPromptInput(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class AnnouncementInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=1000)


class DeviceTokenInput(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    platform: str = Field(default="WEB", max_length=20)


class CoachNoteInput(BaseModel):
    note: str = Field(min_length=1, max_length=2000)


class CoachMessageInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=1000)


class CoachHelpMessageInput(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChallengeCompletionInput(BaseModel):
    answer: str | int | float = Field(max_length=255)
    # Kept as compatibility aliases. Timing is calculated from the server-side deadline.
    elapsed_seconds: float | None = Field(default=None, ge=0, le=3600)
    time_taken_seconds: float | None = Field(default=None, ge=0, le=3600)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


VALID_DIFFICULTIES = {"BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"}
DIFFICULTY_LEVELS = ("BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT")
ALARM_TYPES = {"DAILY", "WEEKDAY", "WEEKEND", "ONE_TIME", "SMART_ADAPTIVE"}
WAKE_VERIFICATION_MODES = {"SINGLE", "MULTI_STEP", "CONSECUTIVE", "TIMED", "ACCURACY"}
ACTIVE_CHALLENGE_STATUS = "ACTIVE"
CHALLENGE_TERMINAL_STATUSES = {"SOLVED", "FAILED", "TIMED_OUT"}
CHALLENGE_ALIASES = {
    "MATH": "MATH",
    "MATH_PROBLEM": "MATH",
    "LOGIC": "LOGIC",
    "LOGIC_PUZZLE": "LOGIC",
    "MEMORY": "MEMORY",
    "MEMORY_CHALLENGE": "MEMORY",
    "WORD": "WORD",
    "WORD_GAME": "WORD",
    "PATTERN": "PATTERN",
    "PATTERN_RECOGNITION": "PATTERN",
    "RIDDLE": "RIDDLE",
    "RIDDLES": "RIDDLE",
    "QUIZ": "QUIZ",
    "QUICK_QUIZ": "QUIZ",
    "REACTION": "REACTION",
}
CHALLENGE_TYPES = ("MATH", "LOGIC", "MEMORY", "WORD", "PATTERN", "RIDDLE", "QUIZ", "REACTION")

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def apply_admin_bootstrap(user: User, db: Session) -> None:
    """Promote a user to ADMIN on first sign-in if their email is listed in ADMIN_BOOTSTRAP_EMAILS.

    Solves the chicken-and-egg problem: role changes normally require an existing
    admin, so without this, the very first admin can only be created by hand in the DB.
    """
    if user.role != Role.ADMIN.value and user.email.lower() in ADMIN_BOOTSTRAP_EMAILS:
        user.role = Role.ADMIN.value
        db.commit()


def issue_token(user: User):
    return jwt.encode(
        {"sub": str(user.id), "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)},
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def send_password_reset_email(email: str, code: str) -> None:
    if not smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password recovery is unavailable until SMTP is configured.",
        )

    message = EmailMessage()
    message["Subject"] = "Your BrainOS password reset code"
    message["From"] = SMTP_FROM
    message["To"] = email
    message.set_content(
        f"Your BrainOS password reset code is {code}. "
        f"It expires in {RESET_CODE_TTL_MINUTES} minutes. "
        "If you did not request this, you can ignore this email."
    )
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Password recovery email could not be delivered.",
        ) from exc


def validate_password_strength(password: str) -> None:
    if (
        len(password) < 8
        or not re.search(r"[A-Z]", password)
        or not re.search(r"[a-z]", password)
        or not re.search(r"\d", password)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters and include uppercase, lowercase, and a number.",
        )


def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(db_session)):
    try:
        user_id = int(jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM]).get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if ADMIN_BOOTSTRAP_EMAILS:
        apply_admin_bootstrap(user, db)
    return user


def require_roles(*roles: Role | str):
    """Return a dependency which authorizes against the current DB role, not the JWT claim."""

    allowed_roles = {role.value if isinstance(role, Role) else str(role).upper() for role in roles}

    def role_guard(user: User = Depends(current_user)):
        if user.role.upper() not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource")
        return user

    return role_guard


def owned_alarm(alarm_id: int, user: User, db: Session):
    alarm = db.get(Alarm, alarm_id)
    if not alarm or alarm.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    return alarm

def verify_wake_completion(alarm: Alarm, user: User, db: Session) -> ChallengeAttempt | None:
    """Evaluate the selected wake-verification policy against recent WAKE_UP attempts."""
    now = datetime.now(timezone.utc)
    recent = list(
        db.scalars(
            select(ChallengeAttempt)
            .where(
                ChallengeAttempt.user_id == user.id,
                ChallengeAttempt.completed.is_(True),
                ChallengeAttempt.intent == "WAKE_UP",
                ChallengeAttempt.completed_at.is_not(None),
                ChallengeAttempt.completed_at >= now - timedelta(minutes=20),
                ChallengeAttempt.alarm_id == alarm.alarm_id,
            )
            .order_by(ChallengeAttempt.completed_at.desc())
            .limit(6)
        ).all()
    )
    if not recent:
        return None

    mode = normalize_wake_verification_mode(alarm.wake_verification_mode)
    successful = [challenge for challenge in recent if challenge.is_correct and challenge.verification_passed]

    if mode == "SINGLE":
        return successful[0] if successful else None

    if mode == "MULTI_STEP":
        return successful[0] if len(successful) >= 2 else None

    if mode == "CONSECUTIVE":
        if len(recent) < 2:
            return None
        first_two = recent[:2]
        return first_two[0] if all(challenge.is_correct and challenge.verification_passed for challenge in first_two) else None

    if mode == "TIMED":
        candidate = successful[0] if successful else None
        if candidate is None:
            return None
        limit = candidate.time_limit_seconds or challenge_time_limit(candidate.difficulty)
        return candidate if candidate.elapsed_seconds is not None and candidate.elapsed_seconds <= limit else None

    # ACCURACY: evaluate the last 3 completed wake checks (including failed checks).
    window = recent[:3]
    if len(window) < 3:
        return None
    accuracy = sum(1 for challenge in window if challenge.is_correct) / len(window)
    return window[0] if accuracy >= 0.80 and window[0].verification_passed else None

@app.post("/alarms/{alarm_id}/verify-wake")
def verify_wake_alarm(
    alarm_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(db_session),
):
    """Check whether the current wake protocol has been fully verified without completing the alarm."""
    alarm = owned_alarm(alarm_id, user, db)

    if alarm.status not in {"ACTIVE", "RINGING"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alarm is not available for wake verification",
        )

    verified = verify_wake_completion(alarm, user, db)
    required_by_mode = {
        "SINGLE": 1,
        "MULTI_STEP": 2,
        "CONSECUTIVE": 2,
        "TIMED": 1,
        "ACCURACY": 3,
    }
    mode = normalize_wake_verification_mode(alarm.wake_verification_mode)
    required = required_by_mode.get(mode, 1)

    recent_attempts = list(
        db.scalars(
            select(ChallengeAttempt)
            .where(
                ChallengeAttempt.user_id == user.id,
                ChallengeAttempt.alarm_id == alarm.alarm_id,
                ChallengeAttempt.intent == "WAKE_UP",
                ChallengeAttempt.completed.is_(True),
                ChallengeAttempt.completed_at.is_not(None),
                ChallengeAttempt.completed_at >= datetime.now(timezone.utc) - timedelta(minutes=20),
            )
            .order_by(ChallengeAttempt.completed_at.desc())
            .limit(6)
        ).all()
    )
    successful_count = sum(
        1 for attempt in recent_attempts
        if attempt.is_correct and attempt.verification_passed
    )

    return {
        "alarm_id": alarm.alarm_id,
        "verified": bool(verified),
        "mode": mode,
        "required_checkpoints": required,
        "successful_checkpoints": successful_count,
        "message": "Wake protocol verified. Choose dismiss or snooze." if verified else "Additional wake verification required.",
    }


@app.post("/alarms/{alarm_id}/complete-wake")
def complete_wake_alarm(
    alarm_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(db_session),
):
    alarm = owned_alarm(alarm_id, user, db)

    if alarm.status not in {"ACTIVE", "RINGING"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alarm is not available for wake completion",
        )

    recent_wake = verify_wake_completion(alarm, user, db)
    if recent_wake is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Complete the required wake verification ({alarm.wake_verification_mode.lower()}) before stopping this alarm. Additional verified checkpoint(s) may be required.",
        )

    alarm.snoozed_until = None

    alarm_type = str(alarm.alarm_type or "").upper()

    if alarm_type == "ONE_TIME":
        alarm.status = "COMPLETED"
        next_at = None
    else:
        alarm.status = "ACTIVE"

        profile = ensure_profile(user, db)
        current_time = local_now(profile)

        next_at = next_occurrence(
            alarm.alarm_time,
            alarm.alarm_type,
            alarm.repeat_days,
            current_time,
        )

    db.commit()
    db.refresh(alarm)

    return {
        "alarm_id": alarm.alarm_id,
        "status": alarm.status,
        "next_at": next_at.isoformat() if next_at else None,
        "message": "Wake protocol completed",
    }



def owned_challenge(challenge_id: int, user: User, db: Session):
    challenge = db.get(ChallengeAttempt, challenge_id)
    if not challenge or challenge.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")
    return challenge


def ensure_profile(user: User, db: Session) -> UserProfile:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        db.flush()
    return profile


def parse_clock(value: str | None) -> time | None:
    if value is None:
        return None
    try:
        return datetime.strptime(value.strip(), "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="preferred_wake_time must be HH:MM")


def parse_alarm_clock(value: str) -> time:
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="alarm_time must be HH:MM")


def normalize_difficulty(value: str | None, fallback: str = "MEDIUM") -> str:
    normalized = (value or fallback).strip().upper()
    aliases = {"NOVICE": "BEGINNER", "ADVANCED": "HARD", "MASTER": "EXPERT"}
    normalized = aliases.get(normalized, normalized)
    if normalized not in VALID_DIFFICULTIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="difficulty must be BEGINNER, EASY, MEDIUM, HARD, or EXPERT",
        )
    return normalized


def normalize_alarm_type(value: str | None) -> str:
    normalized = (value or "DAILY").strip().upper().replace("-", "_").replace(" ", "_")
    aliases = {
        "ONE_OFF": "ONE_TIME",
        "WEEKDAYS": "WEEKDAY",
        "WEEKENDS": "WEEKEND",
        "SMART": "SMART_ADAPTIVE",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in ALARM_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="alarm_type must be DAILY, WEEKDAY, WEEKEND, ONE_TIME, or SMART_ADAPTIVE",
        )
    return normalized


def normalize_wake_verification_mode(value: str | None) -> str:
    normalized = (value or "SINGLE").strip().upper().replace("-", "_").replace(" ", "_")
    aliases = {
        "MULTISTEP": "MULTI_STEP",
        "CONSECUTIVE_CORRECT": "CONSECUTIVE",
        "TIME_BASED": "TIMED",
        "COGNITIVE_ACCURACY": "ACCURACY",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in WAKE_VERIFICATION_MODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="wake_verification_mode must be SINGLE, MULTI_STEP, CONSECUTIVE, TIMED, or ACCURACY",
        )
    return normalized


def normalize_timezone(value: str) -> str:
    candidate = value.strip()
    try:
        ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="timezone must be a valid IANA timezone, such as Asia/Kolkata")
    return candidate


def safe_zone(timezone_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name or "UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def profile_payload(user: User, profile: UserProfile) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "provider": user.provider,
        "timezone": profile.timezone,
        "preferred_wake_time": profile.preferred_wake_time.strftime("%H:%M") if profile.preferred_wake_time else None,
        "target_sleep_duration_minutes": profile.target_sleep_duration_minutes,
        "productivity_goal": profile.productivity_goal,
        "difficulty_preference": profile.difficulty_preference,
        "habit_preferences": profile.habit_preferences or [],
    }


def clean_habit_preferences(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    for value in values:
        item = value.strip()
        if item and item not in cleaned:
            cleaned.append(item[:80])
    if len(cleaned) > 20:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="habit_preferences supports at most 20 entries")
    return cleaned


def normalize_challenge_type(value: str) -> str:
    key = value.strip().upper().replace("-", "_").replace(" ", "_")
    challenge_type = CHALLENGE_ALIASES.get(key)
    if not challenge_type:
        valid = ", ".join(sorted(set(CHALLENGE_ALIASES.values())))
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown challenge type. Use one of: {valid}")
    return challenge_type


def normalize_answer(value: object) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def challenge_time_limit(difficulty: str) -> int:
    return {
        "BEGINNER": 110,
        "EASY": 90,
        "MEDIUM": 75,
        "HARD": 60,
        "EXPERT": 45,
    }[difficulty]


def challenge_max_attempts(difficulty: str) -> int:
    """Tighten verification as difficulty increases without making beginner too punitive."""
    return {
        "BEGINNER": 3,
        "EASY": 3,
        "MEDIUM": 2,
        "HARD": 2,
        "EXPERT": 1,
    }[difficulty]


def max_snoozes_for_alarm(alarm: Alarm) -> int:
    """Anti-snooze cap: reuse the same per-difficulty scale as challenge_max_attempts
    so harder alarms are both harder to answer wrong and harder to keep deferring."""
    return challenge_max_attempts(normalize_difficulty(alarm.difficulty))


def as_utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def challenge_deadline(challenge: ChallengeAttempt) -> datetime:
    if challenge.expires_at:
        return as_utc(challenge.expires_at)
    return as_utc(challenge.created_at) + timedelta(seconds=challenge.time_limit_seconds or challenge_time_limit(challenge.difficulty))


def challenge_elapsed_seconds(challenge: ChallengeAttempt, now: datetime) -> float:
    limit = challenge.time_limit_seconds or challenge_time_limit(challenge.difficulty)
    elapsed = max(0.0, (now - as_utc(challenge.created_at)).total_seconds())
    return min(elapsed, float(limit))


def challenge_remaining_seconds(challenge: ChallengeAttempt, now: datetime) -> int:
    if challenge.completed:
        return 0
    return max(0, math.ceil((challenge_deadline(challenge) - now).total_seconds()))


def recent_completed_challenges(user_id: int, db: Session, challenge_type: str | None = None, limit: int = 12) -> list[ChallengeAttempt]:
    statement = (
        select(ChallengeAttempt)
        .where(ChallengeAttempt.user_id == user_id, ChallengeAttempt.completed.is_(True))
        .order_by(ChallengeAttempt.completed_at.desc(), ChallengeAttempt.created_at.desc())
        .limit(limit)
    )
    if challenge_type:
        statement = statement.where(ChallengeAttempt.challenge_type == challenge_type)
    return list(db.scalars(statement).all())


def median(values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    middle = len(ordered) // 2
    return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2


def challenge_metrics(attempts: list[ChallengeAttempt]) -> dict:
    total = len(attempts)
    correct = sum(1 for attempt in attempts if attempt.is_correct)
    elapsed_values = [float(attempt.elapsed_seconds) for attempt in attempts if attempt.elapsed_seconds is not None]
    speed_ratios = [
        float(attempt.elapsed_seconds) / max(1, attempt.time_limit_seconds or challenge_time_limit(attempt.difficulty))
        for attempt in attempts
        if attempt.elapsed_seconds is not None
    ]
    failure_streak = 0
    for attempt in attempts:
        if attempt.is_correct:
            break
        failure_streak += 1
    return {
        "completed": total,
        "correct": correct,
        "accuracy": correct / total if total else 0.0,
        "average_seconds": sum(elapsed_values) / len(elapsed_values) if elapsed_values else None,
        "median_speed_ratio": median(speed_ratios),
        "average_failed_attempts": (sum(int(attempt.failed_attempts or 0) for attempt in attempts) / total) if total else 0.0,
        "failure_streak": failure_streak,
        "highest_solved_level": max(
            (DIFFICULTY_LEVELS.index(attempt.difficulty) for attempt in attempts if attempt.is_correct and attempt.difficulty in DIFFICULTY_LEVELS),
            default=None,
        ),
    }


def user_performance_rating(metrics: dict) -> dict:
    """Return a stable 1-5 user-performance rating from recent challenge results."""
    completed = int(metrics.get("completed", 0) or 0)
    if completed == 0:
        return {"score": 0, "label": "No data", "stars": "☆☆☆☆☆"}
    accuracy = float(metrics.get("accuracy", 0.0) or 0.0)
    speed_ratio = metrics.get("median_speed_ratio")
    speed_score = 1.0 if speed_ratio is None else max(0.0, min(1.0, 1.0 - max(0.0, float(speed_ratio) - 0.45) / 0.85))
    failure_streak = int(metrics.get("failure_streak", 0) or 0)
    consistency_score = max(0.0, 1.0 - min(4, failure_streak) / 4)
    composite = accuracy * 0.70 + speed_score * 0.20 + consistency_score * 0.10
    score = 5 if composite >= 0.90 else 4 if composite >= 0.75 else 3 if composite >= 0.60 else 2 if composite >= 0.40 else 1
    labels = {1: "Beginner", 2: "Needs practice", 3: "Developing", 4: "Strong", 5: "Expert"}
    return {"score": score, "label": labels[score], "stars": "★" * score + "☆" * (5 - score)}


def choose_challenge_type(user_id: int, requested_type: str | None, db: Session) -> tuple[str, str]:
    raw_type = (requested_type or "").strip()
    if raw_type and raw_type.upper() != "AUTO":
        return normalize_challenge_type(raw_type), "You selected this challenge type."

    attempts = recent_completed_challenges(user_id, db, limit=40)
    by_type = {challenge_type: [attempt for attempt in attempts if attempt.challenge_type == challenge_type] for challenge_type in CHALLENGE_TYPES}
    least_practised = min(len(entries) for entries in by_type.values())
    candidates = [challenge_type for challenge_type, entries in by_type.items() if len(entries) == least_practised]
    if candidates:
        # Rotate cold-start suggestions so a new user is not always sent to math first.
        selected = candidates[len(attempts) % len(candidates)]
        if least_practised < 2:
            return selected, "Selected a less-practised skill to keep your route balanced."

    def support_score(challenge_type: str) -> float:
        metrics = challenge_metrics(by_type[challenge_type])
        return (1 - metrics["accuracy"]) + (metrics["median_speed_ratio"] or 0.7) + metrics["average_failed_attempts"] * 0.35

    selected = max(CHALLENGE_TYPES, key=support_score)
    return selected, "Selected the skill area that would benefit most from another pass."


def choose_challenge_difficulty(
    profile: UserProfile, user_id: int, challenge_type: str, requested_difficulty: str | None, db: Session
) -> tuple[str, str]:
    requested = (requested_difficulty or "").strip().upper()

    # An explicit difficulty is a deliberate user choice; adaptive logic only runs
    # when AUTO/None is requested.
    if requested and requested != "AUTO":
        selected = normalize_difficulty(requested, profile.difficulty_preference)
        return selected, f"Using your selected {selected.lower()} difficulty."

    baseline = normalize_difficulty(profile.difficulty_preference)
    all_recent = recent_completed_challenges(user_id, db, limit=12)
    typed_recent = recent_completed_challenges(user_id, db, challenge_type=challenge_type, limit=12)
    recent = typed_recent if len(typed_recent) >= 3 else all_recent
    if not recent:
        return baseline, f"Starting at your {baseline.lower()} preference until your route has performance history."

    metrics = challenge_metrics(recent)
    base_level = DIFFICULTY_LEVELS.index(baseline)

    is_fast = metrics["median_speed_ratio"] is not None and metrics["median_speed_ratio"] <= 0.70
    is_strong = (
        len(recent) >= 3
        and metrics["accuracy"] >= 0.85
        and is_fast
        and metrics["average_failed_attempts"] <= 0.25
        and metrics["failure_streak"] == 0
    )
    is_struggling = (
        len(recent) >= 2
        and (
            metrics["accuracy"] < 0.50
            or (metrics["median_speed_ratio"] is not None and metrics["median_speed_ratio"] >= 0.90)
            or metrics["average_failed_attempts"] >= 1
            or metrics["failure_streak"] >= 2
        )
    )

    if is_strong:
        level = min(base_level + 1, len(DIFFICULTY_LEVELS) - 1)
        chosen = DIFFICULTY_LEVELS[level]
        return chosen, (
            f"Adaptive engine detected {round(metrics['accuracy'] * 100)}% accuracy, "
            f"fast completion, and stable attempts; increased difficulty to {chosen.lower()}."
        )

    if is_struggling:
        level = max(base_level - 1, 0)
        chosen = DIFFICULTY_LEVELS[level]
        return chosen, (
            f"Adaptive engine detected retries, slower completion, or reduced accuracy; "
            f"reduced difficulty to {chosen.lower()} to rebuild consistency."
        )

    return baseline, f"Keeping {baseline.lower()} while accuracy and pace stabilize."



def challenge_options(challenge_type: str, expected_answer: str, nonce: str, difficulty: str) -> list[str]:
    """Return safe, deterministic answer choices for challenge types where choices improve usability."""
    normalized_type = normalize_challenge_type(challenge_type)
    answer = str(expected_answer)
    digest = hashlib.sha256(f"options|{normalized_type}|{difficulty}|{nonce}|{answer}".encode("utf-8")).digest()
    seed = int.from_bytes(digest[:4], "big")

    if normalized_type == "LOGIC":
        return ["yes", "no"] if answer.lower() in {"yes", "no"} else []

    if normalized_type == "MATH" and re.fullmatch(r"-?\d+", answer):
        numeric = int(answer)
        candidates = [numeric - 2, numeric - 1, numeric + 1, numeric + 2]
        candidates.insert(seed % 4, numeric)
        return [str(value) for value in dict.fromkeys(candidates)]

    if normalized_type == "PATTERN" and re.fullmatch(r"-?\d+", answer):
        numeric = int(answer)
        step = 1 + (seed % 5)
        candidates = [numeric - step, numeric - 1, numeric, numeric + step]
        return [str(value) for value in dict.fromkeys(candidates)]

    if normalized_type == "WORD":
        pool = ["MORNING", "FOCUS", "BALANCE", "ROUTINE", "CLARITY", "ENERGY", "WAKE", "ATTENTION"]
        distractors = [word for word in pool if word.lower() != answer.lower()]
        rotated = distractors[seed % len(distractors):] + distractors[:seed % len(distractors)]
        return [answer] + rotated[:3]

    if normalized_type == "RIDDLE":
        pool = ["towel", "keyboard", "clock", "map", "globe", "shadow"]
        distractors = [item for item in pool if item.lower() != answer.lower()]
        return [answer] + distractors[:3]

    if normalized_type == "QUIZ":
        if answer.lower() == "mars":
            return ["mars", "venus", "jupiter", "mercury"]
        if answer == "60":
            return ["30", "45", "60", "90"]
        if answer.lower() == "carbon dioxide":
            return ["oxygen", "carbon dioxide", "nitrogen", "hydrogen"]

    return []

def challenge_public_payload(challenge: ChallengeAttempt, now: datetime | None = None, selection_reason: str | None = None) -> dict:
    current = now or datetime.now(timezone.utc)
    payload = {
        "challenge_id": challenge.challenge_id,
        "challenge_type": challenge.challenge_type,
        "difficulty": challenge.difficulty,
        "intent": challenge.intent,
        "question": challenge.prompt,
        "options": list(challenge.options or []),
        "time_limit_seconds": challenge.time_limit_seconds,
        "max_attempts": challenge.max_attempts,
        "attempt_count": challenge.attempt_count,
        "failed_attempts": challenge.failed_attempts,
        "attempts_remaining": max(0, (challenge.max_attempts or 0) - (challenge.attempt_count or 0)),
        "status": challenge.status,
        "completed": challenge.completed,
        "expires_at": challenge_deadline(challenge),
        "time_remaining_seconds": challenge_remaining_seconds(challenge, current),
        "created_at": challenge.created_at,
    }
    if selection_reason:
        payload["selection_reason"] = selection_reason
    return payload


def challenge_validation_payload(challenge: ChallengeAttempt, now: datetime, insight: str) -> dict:
    return {
        "challenge_id": challenge.challenge_id,
        "correct": bool(challenge.is_correct),
        "completed": challenge.completed,
        "status": challenge.status,
        "attempt_count": challenge.attempt_count,
        "failed_attempts": challenge.failed_attempts,
        "max_attempts": challenge.max_attempts,
        "attempts_remaining": max(0, (challenge.max_attempts or 0) - (challenge.attempt_count or 0)),
        "elapsed_seconds": round(challenge.elapsed_seconds or challenge_elapsed_seconds(challenge, now), 2),
        "time_limit_seconds": challenge.time_limit_seconds,
        "time_remaining_seconds": challenge_remaining_seconds(challenge, now),
        "expires_at": challenge_deadline(challenge),
        "insight": insight,
    }


def deterministic_challenge(challenge_type: str, difficulty: str, intent: str, nonce: str = "") -> tuple[str, str, str]:
    """Create a reproducible prompt for a single nonce without returning its answer to clients."""

    digest = hashlib.sha256(f"{challenge_type}|{difficulty}|{intent}|{nonce}".encode("utf-8")).digest()
    number = int.from_bytes(digest[:4], "big")
    context = intent.replace("_", " ").strip().title()
    level = {"BEGINNER": 1, "EASY": 1, "MEDIUM": 2, "HARD": 3, "EXPERT": 4}[difficulty]

    if challenge_type == "MATH":
        left, right = 4 + number % 12, 3 + (number // 11) % 12
        if level == 1:
            return f"{context} math: what is {left} + {right}?", str(left + right), "Enter a whole number."
        extra = 2 + (number // 37) % 9
        if level == 2:
            return f"{context} math: what is ({left} × {right}) + {extra}?", str(left * right + extra), "Enter a whole number."
        return f"{context} math: what is ({left} × {right}) - {extra}?", str(left * right - extra), "Enter a whole number."

    if challenge_type == "LOGIC":
        subjects = ["Mira", "Ari", "Nia", "Ravi"]
        groups = ["dawn runners", "focus pilots", "sleep scientists", "habit builders"]
        traits = ["prepared", "alert", "consistent", "curious"]
        subject, group, trait = subjects[number % 4], groups[(number // 5) % 4], traits[(number // 13) % 4]
        return (
            f"{context} logic: all {group} are {trait}. {subject} is a {group}. Is {subject} {trait}? Answer yes or no.",
            "yes",
            "Answer yes or no.",
        )

    if challenge_type == "MEMORY":
        length = 4 + level
        sequence = "".join(str((number >> (index * 3)) % 10) for index in range(length))
        spaced = " ".join(sequence)
        return f"{context} memory: remember this sequence, then enter it without spaces: {spaced}", sequence, "Enter the digits in order."

    if challenge_type == "WORD":
        words = ["MORNING", "FOCUS", "BALANCE", "ROUTINE", "CLARITY", "ENERGY"]
        word = words[number % len(words)]
        shift = 1 + (number // 17) % (len(word) - 1)
        scrambled = word[shift:] + word[:shift]
        return f"{context} word game: unscramble “{scrambled}” to reveal the wake-state word.", word, "Enter one word."

    if challenge_type == "PATTERN":
        start, step = 2 + number % 8, 2 + (number // 7) % (4 + level)
        terms = [start + step * index for index in range(4 + level)]
        answer = start + step * len(terms)
        return f"{context} pattern: what comes next? {', '.join(map(str, terms))}, ?", str(answer), "Enter a whole number."

    if challenge_type == "RIDDLE":
        riddles = [
            ("I get wetter as I dry. What am I?", "towel"),
            ("I have keys but no locks, and space but no room. What am I?", "keyboard"),
            ("What has a face and two hands but no arms or legs?", "clock"),
        ]
        prompt, answer = riddles[number % len(riddles)]
        return f"{context} riddle: {prompt}", answer, "Enter one short answer."

    if challenge_type == "QUIZ":
        quizzes = [
            ("Which planet is known as the Red Planet?", "mars"),
            ("How many minutes are in one hour?", "60"),
            ("What gas do plants absorb from the atmosphere?", "carbon dioxide"),
        ]
        prompt, answer = quizzes[number % len(quizzes)]
        return f"{context} quick quiz: {prompt}", answer, "Enter a concise answer."

    # REACTION is intentionally simple but still recorded like every other challenge.
    phrase = ["READY", "AWAKE", "GO"][(number + level) % 3]
    return f"{context} reaction check: type {phrase} exactly to confirm you are present.", phrase, "Type the displayed word."


def generate_challenge_with_gemini(
    challenge_type: str,
    difficulty: str,
    intent: str,
    user_profile: dict,
) -> tuple[str, str, str, str]:
    """
    Generate a challenge using Gemini API with fallback to deterministic generation.
    
    Returns:
        Tuple of (prompt, expected_answer, instructions, source)
        where source is "GEMINI" or "DETERMINISTIC"
    """
    # WORD and QUIZ challenges always use the deterministic generator: across
    # repeated sampling, Gemini reliably produced self-referential letter or
    # logic puzzles whose own stated answer contradicted its own rules (wrong
    # compass-turn math, anagram answers using letters not in the source
    # word, invented non-words) - unsolvable even by a correctly-reasoning
    # user because the "correct" answer itself was wrong.
    if not USE_GEMINI_CHALLENGES or challenge_type in {"WORD", "QUIZ"}:
        prompt, answer, instructions = deterministic_challenge(
            challenge_type, difficulty, intent, secrets.token_urlsafe(12)
        )
        return prompt, answer, instructions, "DETERMINISTIC"

    gemini_service = get_gemini_service()
    prompt, answer, instructions, source = gemini_service.generate_challenge_with_fallback(
        challenge_type,
        difficulty,
        user_profile,
        intent,
        lambda ct, d, i: deterministic_challenge(ct, d, i, secrets.token_urlsafe(12)),
    )
    return prompt, answer, instructions, source


def latest_sleep_score(user_id: int, db: Session) -> int | None:
    return db.scalar(
        select(Analytics.sleep_score).where(Analytics.user_id == user_id).order_by(Analytics.recorded_at.desc()).limit(1)
    )


def local_now(profile: UserProfile) -> datetime:
    return datetime.now(timezone.utc).astimezone(safe_zone(profile.timezone)).replace(tzinfo=None, second=0, microsecond=0)


def scheduled_occurrence(
    alarm: Alarm,
    sleep_score: int | None,
    current_time: datetime,
) -> datetime | None:
    occurrence = next_occurrence(
        alarm.alarm_time,
        alarm.alarm_type,
        alarm.repeat_days,
        current_time,
    )
    if not occurrence:
        return None

    if alarm.alarm_type != "SMART_ADAPTIVE":
        return occurrence

    # Rule-based Smart Adaptive Alarm:
    # poorer recovery gently shifts the wake checkpoint later, capped at 15 minutes.
    if sleep_score is None:
        return occurrence

    if sleep_score < 50:
        offset = 15
    elif sleep_score < 70:
        offset = 5
    else:
        offset = 0

    return occurrence + timedelta(minutes=offset)


def next_alarm_options(
    user: User,
    db: Session,
    now: datetime | None = None,
) -> tuple[UserProfile, datetime, list[tuple[Alarm, datetime]]]:
    profile = ensure_profile(user, db)
    current_time = now or local_now(profile)
    score = latest_sleep_score(user.id, db)

    active = db.scalars(
        select(Alarm).where(
            Alarm.user_id == user.id,
            Alarm.status == "ACTIVE",
        )
    ).all()

    options: list[tuple[Alarm, datetime]] = []

    current_utc = datetime.now(timezone.utc)
    zone = safe_zone(profile.timezone)

    for alarm in active:
        snoozed_until = alarm.snoozed_until

        if snoozed_until is not None:
            snooze_utc = as_utc(snoozed_until).astimezone(timezone.utc)
            if snooze_utc > current_utc:
                options.append((alarm, snooze_utc))
                continue

            # Snooze has expired; normal scheduling resumes.
            alarm.snoozed_until = None

        occurrence = scheduled_occurrence(
            alarm,
            score,
            current_time,
        )

        if occurrence:
            occurrence_utc = occurrence.replace(tzinfo=zone).astimezone(timezone.utc)
            options.append((alarm, occurrence_utc))

    if any(alarm.snoozed_until is None for alarm, _ in options):
        db.commit()

    return profile, current_time, options

def snooze_pattern_metrics(user_id: int, db: Session, now: datetime | None = None) -> dict:
    """Return reliable snooze-pattern metrics for one authenticated user."""
    current = as_utc(now or datetime.now(timezone.utc))
    events = list(
        db.scalars(
            select(SnoozeEvent)
            .where(SnoozeEvent.user_id == user_id)
            .order_by(SnoozeEvent.snoozed_at.desc())
        ).all()
    )

    durations = [int(event.snooze_minutes) for event in events if event.snooze_minutes is not None]
    counts_by_duration: dict[int, int] = {}
    for minutes in durations:
        counts_by_duration[minutes] = counts_by_duration.get(minutes, 0) + 1

    cutoff = current - timedelta(days=7)
    recent_events = [event for event in events if as_utc(event.snoozed_at) >= cutoff]
    recent_active_days = {as_utc(event.snoozed_at).date() for event in recent_events}

    # Snoozes per wake and the snooze rate are normalized against the same
    # wake-session grouping wake_behavior_metrics uses, so a multi-step
    # verification isn't miscounted as multiple wakes.
    wake_attempts = list(
        db.scalars(
            select(ChallengeAttempt)
            .where(
                ChallengeAttempt.user_id == user_id,
                ChallengeAttempt.intent == "WAKE_UP",
                ChallengeAttempt.completed.is_(True),
                ChallengeAttempt.completed_at.is_not(None),
                ChallengeAttempt.completed_at >= cutoff,
            )
            .order_by(ChallengeAttempt.completed_at.asc())
        ).all()
    )
    sessions = _group_wake_sessions(wake_attempts)
    successful_wake_days = {
        _analytics_day(session[-1].completed_at)
        for session in sessions
        if session and any(attempt.is_correct and attempt.verification_passed for attempt in session)
        and _analytics_day(session[-1].completed_at) is not None
    }
    successful_wake_count = sum(
        1 for session in sessions if any(attempt.is_correct and attempt.verification_passed for attempt in session)
    )
    snoozes_per_wake = round(len(recent_events) / successful_wake_count, 2) if successful_wake_count else None
    snoozed_wake_days = recent_active_days & successful_wake_days
    recent_7_day_snooze_rate = (
        round((len(snoozed_wake_days) / len(successful_wake_days)) * 100) if successful_wake_days else None
    )

    return {
        "total_snoozes": len(events),
        "average_snooze_minutes": round(sum(durations) / len(durations), 2) if durations else None,
        "most_common_snooze_minutes": max(counts_by_duration, key=counts_by_duration.get) if counts_by_duration else None,
        "recent_7_day_snoozes": len(recent_events),
        "recent_7_day_active_days": len(recent_active_days),
        "snoozes_per_wake": snoozes_per_wake,
        "recent_7_day_snooze_rate": recent_7_day_snooze_rate,
        "data_window_days": 7,
    }


@app.post("/alarms/{alarm_id}/snooze")
def snooze_alarm(
    alarm_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(db_session),
):
    # Lock the row so two nearly-simultaneous snooze clicks cannot create duplicate events.
    alarm = db.scalar(
        select(Alarm)
        .where(Alarm.alarm_id == alarm_id, Alarm.user_id == user.id)
        .with_for_update()
    )
    if alarm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")

    if alarm.status != "RINGING":
        if alarm.snoozed_until and as_utc(alarm.snoozed_until) > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Alarm is already snoozed",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alarm is not currently ringing",
        )

    minutes = max(0, int(alarm.snooze_minutes or 0))
    if minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze is disabled for this alarm",
        )

    # Anti-snooze: cap how many times this ring cycle can be deferred before
    # the wake challenge must be completed.
    max_snoozes = max_snoozes_for_alarm(alarm)
    snooze_count_query = select(func.count(SnoozeEvent.snooze_id)).where(SnoozeEvent.alarm_id == alarm.alarm_id)
    if alarm.last_fired_at:
        snooze_count_query = snooze_count_query.where(SnoozeEvent.snoozed_at >= as_utc(alarm.last_fired_at))
    snoozes_this_cycle = db.scalar(snooze_count_query) or 0
    if snoozes_this_cycle >= max_snoozes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum snoozes ({max_snoozes}) reached for this wake cycle. Complete the challenge to dismiss.",
        )

    now = datetime.now(timezone.utc)
    alarm.snoozed_until = now + timedelta(minutes=minutes)
    alarm.status = "ACTIVE"
    db.add(
        SnoozeEvent(
            user_id=user.id,
            alarm_id=alarm.alarm_id,
            snooze_minutes=minutes,
            snoozed_at=now,
        )
    )

    db.commit()
    db.refresh(alarm)

    return {
        "alarm_id": alarm.alarm_id,
        "snoozed_until": alarm.snoozed_until,
        "snooze_minutes": minutes,
        "status": "SNOOZED",
    }

@app.get("/alarms/notifications/due")
def due_alarm_notifications(user: User = Depends(current_user), db: Session = Depends(db_session)):
    ringing = db.scalars(
        select(Alarm)
        .where(
            Alarm.user_id == user.id,
            Alarm.status == "RINGING",
            Alarm.notification_enabled.is_(True),
        )
        .order_by(Alarm.last_fired_at.desc())
    ).all()
    return [
        {
            "alarm_id": alarm.alarm_id,
            "title": alarm.title,
            "alarm_time": alarm.alarm_time.strftime("%H:%M"),
            "sound": alarm.sound,
            "vibration": alarm.vibration,
            "fired_at": alarm.last_fired_at,
        }
        for alarm in ringing
    ]


def fire_due_alarms():
    """Dispatch only alarms whose recurrence resolves to this local minute for each user."""

    now_utc = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    with SessionLocal() as db:
        active_alarms = db.scalars(select(Alarm).where(Alarm.status == "ACTIVE")).all()
        profile_cache: dict[int, UserProfile] = {}
        score_cache: dict[int, int | None] = {}
        fired = False
        for alarm in active_alarms:
            if alarm.user_id not in profile_cache:
                profile_cache[alarm.user_id] = db.scalar(select(UserProfile).where(UserProfile.user_id == alarm.user_id)) or UserProfile(
                    user_id=alarm.user_id
                )
            if alarm.user_id not in score_cache:
                score_cache[alarm.user_id] = latest_sleep_score(alarm.user_id, db)
            profile = profile_cache[alarm.user_id]
            zone = safe_zone(profile.timezone)
            current_local = now_utc.astimezone(zone).replace(tzinfo=None)
            current_local = current_local.replace(second=0, microsecond=0)
            due_local = scheduled_occurrence(
                alarm,
                score_cache[alarm.user_id],
                current_local - timedelta(minutes=1),
            )
            if due_local != current_local:
                continue
            due_utc = due_local.replace(tzinfo=zone).astimezone(timezone.utc).replace(second=0, microsecond=0)
            if alarm.last_fired_at:
                previous = alarm.last_fired_at
                if previous.tzinfo is None:
                    previous = previous.replace(tzinfo=timezone.utc)
                if previous.astimezone(timezone.utc).replace(second=0, microsecond=0) == due_utc:
                    continue
            print(f"BrainOS alarm fired: user={alarm.user_id}, alarm={alarm.alarm_id}, title={alarm.title}")
            alarm.last_fired_at = now_utc
            alarm.snoozed_until = None
            alarm.status = "RINGING"
            db.add(Notification(
                user_id=alarm.user_id,
                notification_type="WAKE_REMINDER",
                title=alarm.title or "Wake mission",
                message="Your alarm is ringing. Complete the cognitive challenge to dismiss it.",
            ))
            tokens = user_device_tokens(alarm.user_id, db)
            if tokens:
                get_fcm_service().send(
                    tokens,
                    title=alarm.title or "Wake mission",
                    body="Your alarm is ringing. Complete the cognitive challenge to dismiss it.",
                    data={"type": "WAKE_REMINDER", "alarm_id": alarm.alarm_id},
                )
            fired = True
        if fired:
            db.commit()


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(engine)
    # Existing PostgreSQL installations get additive alarm fields; fresh databases use metadata above.
    if engine.dialect.name == "postgresql":
        statements = [
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS title VARCHAR(120) DEFAULT 'Wake mission'",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS alarm_type VARCHAR(30) DEFAULT 'DAILY'",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS sound VARCHAR(80) DEFAULT 'Neural Dawn'",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS vibration BOOLEAN DEFAULT TRUE",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS snooze_minutes INTEGER DEFAULT 5",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS daybreak_route_enabled BOOLEAN DEFAULT TRUE",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS wake_window_minutes INTEGER DEFAULT 15",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS last_fired_at TIMESTAMPTZ",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS challenge_type VARCHAR(30) DEFAULT 'AUTO'",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS wake_verification_mode VARCHAR(30) DEFAULT 'SINGLE'",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS alarm_id INTEGER",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE'",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 2",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 75",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
            "ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS verification_passed BOOLEAN DEFAULT FALSE",
            "CREATE TABLE IF NOT EXISTS snooze_events (snooze_id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, alarm_id INTEGER NOT NULL REFERENCES alarms(alarm_id) ON DELETE CASCADE, snooze_minutes INTEGER NOT NULL, snoozed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)",
            "CREATE INDEX IF NOT EXISTS idx_snooze_events_user_snoozed_at ON snooze_events(user_id, snoozed_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_snooze_events_alarm_snoozed_at ON snooze_events(alarm_id, snoozed_at DESC)",
            "CREATE TABLE IF NOT EXISTS notifications (notification_id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, notification_type VARCHAR(40) NOT NULL, title VARCHAR(160) NOT NULL, message TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)",
            "CREATE TABLE IF NOT EXISTS password_reset_codes (reset_id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, email VARCHAR(255) NOT NULL, code_hash VARCHAR(255) NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used BOOLEAN NOT NULL DEFAULT FALSE, sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)",
            "CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_sent ON password_reset_codes(user_id, sent_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email, used, expires_at)",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
        ]
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
    if not scheduler.running:
        scheduler.add_job(fire_due_alarms, "interval", seconds=10, id="alarm_dispatch", replace_existing=True, max_instances=1, coalesce=True)
        scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/health")
def health():
    return {"status": "neural core online"}


ASSISTANT_HISTORY_LIMIT = 12


@app.get("/assistant/messages")
def list_assistant_messages(user: User = Depends(current_user), db: Session = Depends(db_session)):
    messages = db.scalars(
        select(AssistantMessage).where(AssistantMessage.user_id == user.id).order_by(AssistantMessage.created_at)
    ).all()
    return {"messages": [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]}


@app.delete("/assistant/messages", status_code=status.HTTP_204_NO_CONTENT)
def clear_assistant_messages(user: User = Depends(current_user), db: Session = Depends(db_session)):
    for message in db.scalars(select(AssistantMessage).where(AssistantMessage.user_id == user.id)).all():
        db.delete(message)
    db.commit()
    return None


@app.post("/assistant/help")
def assistant_help(data: AssistantPromptInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    profile_record = ensure_profile(user, db)
    user_profile = {
        "timezone": profile_record.timezone,
        "productivity_goal": profile_record.productivity_goal or "focus better in the morning",
        "habit_preferences": profile_record.habit_preferences or [],
    }
    recent_messages = db.scalars(
        select(AssistantMessage)
        .where(AssistantMessage.user_id == user.id)
        .order_by(AssistantMessage.created_at.desc())
        .limit(ASSISTANT_HISTORY_LIMIT)
    ).all()
    history = [{"role": message.role, "content": message.content} for message in reversed(recent_messages)]

    user_message = data.message.strip()
    db.add(AssistantMessage(user_id=user.id, role="USER", content=user_message))
    db.commit()

    reply = get_gemini_service().generate_assistant_reply(user_message, user_profile, history)
    source = get_gemini_service().last_response_source

    assistant_message = AssistantMessage(user_id=user.id, role="ASSISTANT", content=reply)
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return {"reply": reply, "source": source, "created_at": assistant_message.created_at}


def _serialize_help_message(message: "CoachHelpMessage") -> dict:
    return {
        "message_id": message.message_id,
        "sender": message.sender_role,
        "content": message.content,
        "created_at": message.created_at,
    }


@app.get("/coach/help/messages")
def list_own_coach_help_messages(user: User = Depends(current_user), db: Session = Depends(db_session)):
    assignment = db.scalar(select(CoachAssignment).where(CoachAssignment.member_id == user.id))
    if not assignment:
        return {"coach_assigned": False, "coach_name": None, "messages": []}
    messages = db.scalars(
        select(CoachHelpMessage).where(CoachHelpMessage.member_id == user.id).order_by(CoachHelpMessage.created_at)
    ).all()
    unread = [m for m in messages if m.sender_role == "COACH" and not m.read]
    for message in unread:
        message.read = True
    if unread:
        db.commit()
    coach = db.get(User, assignment.coach_id)
    return {
        "coach_assigned": True,
        "coach_name": coach.name if coach else "Coach",
        "messages": [_serialize_help_message(m) for m in messages],
    }


@app.post("/coach/help/messages", status_code=status.HTTP_201_CREATED)
def send_own_coach_help_message(
    data: CoachHelpMessageInput, user: User = Depends(current_user), db: Session = Depends(db_session)
):
    assignment = db.scalar(select(CoachAssignment).where(CoachAssignment.member_id == user.id))
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You don't have a coach assigned yet.")
    content = data.message.strip()
    record = CoachHelpMessage(member_id=user.id, coach_id=assignment.coach_id, sender_role="USER", content=content)
    db.add(record)
    db.add(Notification(
        user_id=assignment.coach_id,
        notification_type="COACH_HELP_REQUEST",
        title=f"{user.name} needs help",
        message=content,
    ))
    db.commit()
    db.refresh(record)
    tokens = user_device_tokens(assignment.coach_id, db)
    get_fcm_service().send(tokens, title=f"{user.name} needs help", body=content, data={"type": "COACH_HELP_REQUEST"})
    return _serialize_help_message(record)


@app.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def register(data: RegisterInput, db: Session = Depends(db_session)):
    validate_password_strength(data.password)
    if db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    user = User(name=data.name.strip(), email=data.email.lower(), password=pwd_context.hash(data.password), provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(UserProfile(user_id=user.id))
    db.commit()
    apply_admin_bootstrap(user, db)
    return {"access_token": issue_token(user)}


@app.post("/login", response_model=TokenResponse)
@app.post("/api/auth/login", response_model=TokenResponse, include_in_schema=False)
def login(data: LoginInput, db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.password or not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.")
    apply_admin_bootstrap(user, db)
    return {"access_token": issue_token(user)}


def issue_password_reset_code(email: str, db: Session) -> None:
    normalized_email = email.lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if not user:
        return

    now = datetime.now(timezone.utc)
    latest = db.scalar(
        select(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.used.is_(False),
        )
        .order_by(PasswordResetCode.sent_at.desc())
    )
    if latest and (now - as_utc(latest.sent_at)).total_seconds() < RESET_RESEND_COOLDOWN_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another reset code.",
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    send_password_reset_email(normalized_email, code)
    db.add(
        PasswordResetCode(
            user_id=user.id,
            email=normalized_email,
            code_hash=pwd_context.hash(code),
            expires_at=now + timedelta(minutes=RESET_CODE_TTL_MINUTES),
            sent_at=now,
        )
    )
    db.commit()


@app.post("/auth/password-reset/request")
@app.post("/auth/password-reset/resend")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(db_session)):
    if not smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password recovery is unavailable until SMTP is configured.",
        )
    issue_password_reset_code(data.email, db)
    return {"message": "If an account exists, a reset code has been sent."}


@app.post("/auth/password-reset/confirm")
def confirm_password_reset(data: PasswordResetConfirm, db: Session = Depends(db_session)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Passwords do not match.")
    validate_password_strength(data.new_password)

    normalized_email = data.email.lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    reset = (
        db.scalar(
            select(PasswordResetCode)
            .where(
                PasswordResetCode.email == normalized_email,
                PasswordResetCode.used.is_(False),
            )
            .order_by(PasswordResetCode.sent_at.desc())
        )
        if user
        else None
    )
    now = datetime.now(timezone.utc)
    if not reset or reset.user_id != user.id or now >= as_utc(reset.expires_at):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code is invalid or expired.")
    if reset.attempts >= RESET_MAX_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many invalid reset attempts.")

    reset.attempts += 1
    if not pwd_context.verify(data.otp, reset.code_hash):
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code is invalid or expired.")

    user.password = pwd_context.hash(data.new_password)
    reset.used = True
    db.commit()
    return {"message": "Password reset successful. You can now sign in."}


@app.get("/oauth/google")
async def google_login(request: Request):
    if not os.getenv("GOOGLE_CLIENT_ID"):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth has not been configured.")
    return await oauth.google.authorize_redirect(request, request.url_for("google_callback"))


@app.get("/oauth/google/callback")
async def google_callback(request: Request, db: Session = Depends(db_session)):
    token = await oauth.google.authorize_access_token(request)
    info = token.get("userinfo") or await oauth.google.userinfo(token=token)
    email = info["email"].lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(name=info.get("name", email.split("@")[0]), email=email, provider="GOOGLE")
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(UserProfile(user_id=user.id))
        db.commit()
    apply_admin_bootstrap(user, db)
    return RedirectResponse(f"{FRONTEND_URL}?token={issue_token(user)}")


@app.get("/profile")
def profile(user: User = Depends(current_user), db: Session = Depends(db_session)):
    return profile_payload(user, ensure_profile(user, db))


@app.patch("/profile")
@app.put("/profile", include_in_schema=False)
def update_profile(data: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(db_session)):
    profile_record = ensure_profile(user, db)
    supplied = data.model_fields_set
    if "name" in supplied:
        if data.name is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name cannot be null")
        user.name = data.name.strip()
    if "timezone" in supplied:
        profile_record.timezone = normalize_timezone(data.timezone) if data.timezone is not None else "UTC"
    if "preferred_wake_time" in supplied:
        profile_record.preferred_wake_time = parse_clock(data.preferred_wake_time)
    if "target_sleep_duration_minutes" in supplied:
        profile_record.target_sleep_duration_minutes = data.target_sleep_duration_minutes
    if "productivity_goal" in supplied:
        profile_record.productivity_goal = data.productivity_goal.strip() if data.productivity_goal else None
    if "difficulty_preference" in supplied:
        profile_record.difficulty_preference = normalize_difficulty(data.difficulty_preference) if data.difficulty_preference else "MEDIUM"
    if "habit_preferences" in supplied:
        profile_record.habit_preferences = clean_habit_preferences(data.habit_preferences or [])
    db.commit()
    db.refresh(profile_record)
    return profile_payload(user, profile_record)


@app.get("/profile/preferences")
def get_profile_preferences(user: User = Depends(current_user), db: Session = Depends(db_session)):
    profile_record = ensure_profile(user, db)
    return {key: value for key, value in profile_payload(user, profile_record).items() if key not in {"id", "name", "email", "role", "provider"}}


@app.patch("/profile/preferences")
def update_profile_preferences(data: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return update_profile(data, user, db)


@app.get("/admin/roles")
def list_roles(_: User = Depends(require_roles(Role.ADMIN))):
    return {"roles": [role.value for role in Role]}


@app.get("/admin/users")
def list_users(
    limit: int = Query(default=100, ge=1, le=200),
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    users = db.scalars(select(User).order_by(User.created_at.desc()).limit(limit)).all()
    profiles = {profile.user_id: profile for profile in db.scalars(select(UserProfile).where(UserProfile.user_id.in_([user.id for user in users]))).all()} if users else {}
    return {"users": [profile_payload(user, profiles.get(user.id) or ensure_profile(user, db)) for user in users]}


@app.patch("/admin/users/{user_id}/role")
def set_user_role(
    user_id: int,
    data: RoleUpdateInput,
    admin: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == admin.id and data.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="An administrator cannot remove their own admin role")
    target.role = data.role.value
    db.commit()
    return {"id": target.id, "email": target.email, "role": target.role}


def get_coach_or_404(coach_id: int, db: Session) -> User:
    coach = db.get(User, coach_id)
    if not coach or coach.role != Role.WELLNESS_COACH.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not found")
    return coach


@app.get("/admin/coaches/{coach_id}/members")
def list_coach_members(
    coach_id: int,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    get_coach_or_404(coach_id, db)
    member_ids = db.scalars(select(CoachAssignment.member_id).where(CoachAssignment.coach_id == coach_id)).all()
    members = db.scalars(select(User).where(User.id.in_(member_ids))).all() if member_ids else []
    return {"coach_id": coach_id, "members": [{"user_id": member.id, "name": member.name, "email": member.email} for member in members]}


@app.post("/admin/coaches/{coach_id}/members", status_code=status.HTTP_201_CREATED)
def assign_member_to_coach(
    coach_id: int,
    data: CoachAssignmentInput,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    get_coach_or_404(coach_id, db)
    member = db.get(User, data.member_id)
    if not member or member.role != Role.USER.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    existing = db.scalar(
        select(CoachAssignment).where(CoachAssignment.coach_id == coach_id, CoachAssignment.member_id == data.member_id)
    )
    if existing:
        return {"coach_id": coach_id, "member_id": data.member_id, "already_assigned": True}
    db.add(CoachAssignment(coach_id=coach_id, member_id=data.member_id))
    db.commit()
    return {"coach_id": coach_id, "member_id": data.member_id, "already_assigned": False}


@app.delete("/admin/coaches/{coach_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_member_from_coach(
    coach_id: int,
    member_id: int,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    assignment = db.scalar(
        select(CoachAssignment).where(CoachAssignment.coach_id == coach_id, CoachAssignment.member_id == member_id)
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return None


def serialize_alarm(alarm: Alarm, db: Session, user: User, next_at: datetime | None = None) -> dict:
    if next_at is None and alarm.status == "ACTIVE":
        _, _, options = next_alarm_options(user, db)
        next_at = next((moment for candidate, moment in options if candidate.alarm_id == alarm.alarm_id), None)

    return {
        "alarm_id": alarm.alarm_id,
        "user_id": alarm.user_id,
        "alarm_time": alarm.alarm_time.strftime("%H:%M"),
        "repeat_days": alarm.repeat_days,
        "difficulty": alarm.difficulty,
        "status": alarm.status,
        "title": alarm.title,
        "alarm_type": alarm.alarm_type,
        "sound": alarm.sound,
        "vibration": alarm.vibration,
        "snooze_minutes": alarm.snooze_minutes,
        "daybreak_route_enabled": alarm.daybreak_route_enabled,
        "wake_window_minutes": alarm.wake_window_minutes,
        "challenge_type": alarm.challenge_type,
        "wake_verification_mode": alarm.wake_verification_mode,
        "notification_enabled": alarm.notification_enabled,
        "snoozed_until": alarm.snoozed_until,
        "last_fired_at": alarm.last_fired_at,
        "next_at": next_at,
    }


@app.post("/alarm", status_code=status.HTTP_201_CREATED)
def create_alarm(data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm_type = normalize_alarm_type(data.alarm_type)
    status_value = data.status.upper() if data.status.upper() in {"ACTIVE", "DISABLED"} else "ACTIVE"
    challenge_type = (
        normalize_challenge_type(data.challenge_type)
        if data.challenge_type.upper() != "AUTO"
        else "AUTO"
    )
    alarm = Alarm(
        user_id=user.id,
        alarm_time=parse_alarm_clock(data.alarm_time),
        title=data.title.strip(),
        alarm_type=alarm_type,
        repeat_days=data.repeat_days,
        difficulty=normalize_difficulty(data.difficulty),
        sound=data.sound,
        vibration=data.vibration,
        snooze_minutes=data.snooze_minutes,
        status=status_value,
        daybreak_route_enabled=data.daybreak_route_enabled,
        wake_window_minutes=data.wake_window_minutes,
        challenge_type=challenge_type,
        wake_verification_mode=normalize_wake_verification_mode(data.wake_verification_mode),
        notification_enabled=data.notification_enabled,
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return serialize_alarm(alarm, db, user)


@app.get("/alarms")
def alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    records = db.scalars(
        select(Alarm).where(Alarm.user_id == user.id).order_by(Alarm.alarm_time)
    ).all()
    return [serialize_alarm(alarm, db, user) for alarm in records]


@app.patch("/alarm/{alarm_id}")
def update_alarm(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = owned_alarm(alarm_id, user, db)
    alarm.alarm_time = parse_alarm_clock(data.alarm_time)
    alarm.title = data.title.strip()
    alarm.alarm_type = normalize_alarm_type(data.alarm_type)
    alarm.repeat_days = data.repeat_days
    alarm.difficulty = normalize_difficulty(data.difficulty)
    alarm.sound = data.sound
    alarm.vibration = data.vibration
    alarm.snooze_minutes = data.snooze_minutes
    alarm.status = data.status.upper() if data.status.upper() in {"ACTIVE", "DISABLED"} else "ACTIVE"
    alarm.daybreak_route_enabled = data.daybreak_route_enabled
    alarm.wake_window_minutes = data.wake_window_minutes
    alarm.challenge_type = (
        normalize_challenge_type(data.challenge_type)
        if data.challenge_type.upper() != "AUTO"
        else "AUTO"
    )
    alarm.wake_verification_mode = normalize_wake_verification_mode(data.wake_verification_mode)
    alarm.notification_enabled = data.notification_enabled
    alarm.snoozed_until = None
    alarm.last_fired_at = None
    db.commit()
    db.refresh(alarm)
    return serialize_alarm(alarm, db, user)


@app.delete("/alarm/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    db.delete(owned_alarm(alarm_id, user, db))
    db.commit()


@app.post("/alarms", status_code=status.HTTP_201_CREATED)
def create_alarm_rest(data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return create_alarm(data, user, db)


@app.get("/alarms/today")
def today_alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    profile, current_time, options = next_alarm_options(user, db)
    zone = safe_zone(profile.timezone)
    return [serialize_alarm(alarm, db, user, occurrence) for alarm, occurrence in options if occurrence.astimezone(zone).date() == current_time.date()]


@app.get("/alarms/upcoming")
def upcoming_alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    _, _, options = next_alarm_options(user, db)
    return [
        {"alarm": serialize_alarm(alarm, db, user, occurrence), "next_at": occurrence}
        for alarm, occurrence in sorted(options, key=lambda item: item[1])
    ]


@app.get("/alarms/{alarm_id}")
def get_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return serialize_alarm(owned_alarm(alarm_id, user, db), db, user)


@app.put("/alarms/{alarm_id}")
def update_alarm_rest(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return update_alarm(alarm_id, data, user, db)


@app.delete("/alarms/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm_rest(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return delete_alarm(alarm_id, user, db)


@app.patch("/alarms/{alarm_id}/enable")
def enable_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = owned_alarm(alarm_id, user, db)
    alarm.status = "ACTIVE"
    alarm.snoozed_until = None
    alarm.last_fired_at = None
    db.commit()
    db.refresh(alarm)
    return serialize_alarm(alarm, db, user)


@app.patch("/alarms/{alarm_id}/disable")
def disable_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = owned_alarm(alarm_id, user, db)
    alarm.status = "DISABLED"
    alarm.snoozed_until = None
    db.commit()
    db.refresh(alarm)
    return serialize_alarm(alarm, db, user)


@app.patch("/alarms/{alarm_id}/{command}")
def toggle_alarm(alarm_id: int, command: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    if command not in {"enable", "disable"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Use enable or disable")
    alarm = owned_alarm(alarm_id, user, db)
    alarm.status = "ACTIVE" if command == "enable" else "DISABLED"
    alarm.snoozed_until = None
    if command == "enable":
        alarm.last_fired_at = None
    db.commit()
    db.refresh(alarm)
    return serialize_alarm(alarm, db, user)


RINGING_STALE_MINUTES = 15

@app.post("/alarms/check-next")
def check_next_alarm(user: User = Depends(current_user), db: Session = Depends(db_session)):
    now_utc = datetime.now(timezone.utc)
    ringing = db.scalars(
        select(Alarm)
        .where(Alarm.user_id == user.id, Alarm.status == "RINGING")
        .order_by(Alarm.last_fired_at.desc())
    ).all()

    if ringing:
        fresh = []
        for alarm in ringing:
            fired_at = alarm.last_fired_at
            if fired_at is None:
                continue
            if fired_at.tzinfo is None:
                fired_at = fired_at.replace(tzinfo=timezone.utc)
            age = now_utc - fired_at.astimezone(timezone.utc)
            if age <= timedelta(minutes=RINGING_STALE_MINUTES):
                fresh.append((alarm, fired_at))
            else:
                # Recover abandoned/stale ringing states after a browser/backend restart.
                alarm.status = "ACTIVE"
                alarm.snoozed_until = None

        if fresh:
            alarm, fired_at = fresh[0]
            db.commit()
            db.refresh(alarm)
            return {
                "next_alarm": serialize_alarm(alarm, db, user),
                "next_at": fired_at,
                "state": "RINGING",
            }

        db.commit()

    _, _, options = next_alarm_options(user, db)
    if not options:
        return {"next_alarm": None, "next_at": None, "state": "IDLE"}

    alarm, moment = min(options, key=lambda item: item[1])
    return {"next_alarm": serialize_alarm(alarm, db, user, next_at=moment), "next_at": moment, "state": "SCHEDULED"}


@app.get("/daybreak-route")
@app.get("/daybreak-route/today")
def daybreak_route(user: User = Depends(current_user), db: Session = Depends(db_session)):
    profile_record, current_time, options = next_alarm_options(user, db)
    selected = min(options, key=lambda item: item[1]) if options else None
    if selected:
        alarm, next_at = selected
        route_enabled = alarm.daybreak_route_enabled
        wake_window = alarm.wake_window_minutes if route_enabled else 0
        wake_window_opens_at = next_at - timedelta(minutes=wake_window) if route_enabled else None
        next_alarm = {
            "alarm_id": alarm.alarm_id,
            "title": alarm.title,
            "alarm_time": alarm.alarm_time.strftime("%H:%M"),
            "next_at": next_at,
            "alarm_type": alarm.alarm_type,
            "difficulty": alarm.difficulty,
            "wake_window_minutes": wake_window,
            "daybreak_route_enabled": route_enabled,
        }
    else:
        wake_window, wake_window_opens_at, next_alarm = 0, None, None
    productivity_goal = profile_record.productivity_goal or "Choose one meaningful task for your first focus block."
    difficulty = profile_record.difficulty_preference or "MEDIUM"
    steps = [
        {
            "order": 1,
            "phase": "ANCHOR",
            "title": "Wake anchor",
            "action": "Stand up, drink water, and let natural light in.",
            "window_minutes": wake_window,
        },
        {
            "order": 2,
            "phase": "IGNITE",
            "title": "Cognitive ignition",
            "action": f"Complete a {difficulty.lower()} {('memory' if 'memory' in (profile_record.habit_preferences or []) else 'pattern')} challenge.",
            "window_minutes": 3,
        },
        {
            "order": 3,
            "phase": "LAUNCH",
            "title": "Focus launch",
            "action": productivity_goal,
            "window_minutes": 15,
        },
    ]
    return {
        "route_name": "Daybreak Route",
        "date": current_time.date().isoformat(),
        "timezone": profile_record.timezone,
        "next_alarm": next_alarm,
        "wake_window_opens_at": wake_window_opens_at,
        "steps": steps,
    }


@app.post("/mission", status_code=status.HTTP_201_CREATED)
def create_mission(data: MissionInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    mission = Mission(user_id=user.id, challenge_type=data.challenge_type.upper(), reward=data.reward)
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


@app.get("/missions")
def missions(user: User = Depends(current_user), db: Session = Depends(db_session)):
    return db.scalars(select(Mission).where(Mission.user_id == user.id).order_by(Mission.created_at.desc())).all()


@app.patch("/mission/{mission_id}/complete")
def complete_mission(
    mission_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(db_session),
):
    mission = db.get(Mission, mission_id)
    if not mission or mission.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission not found",
        )

    mission.completed = True
    mission.completed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "mission_id": mission_id,
        "completed": True,
        "reward": mission.reward,
    }


@app.post("/challenge", status_code=status.HTTP_201_CREATED, include_in_schema=False)
@app.post("/challenges/generate", status_code=status.HTTP_201_CREATED)
def generate_challenge(
    data: ChallengeGenerateInput,
    user: User = Depends(current_user),
    db: Session = Depends(db_session),
):
    """Build a time-bound challenge without ever exposing the expected answer. Uses Gemini for personalization if enabled."""

    profile_record = ensure_profile(user, db)
    challenge_type, type_reason = choose_challenge_type(user.id, data.type or data.challenge_type, db)
    difficulty, difficulty_reason = choose_challenge_difficulty(profile_record, user.id, challenge_type, data.difficulty, db)
    intent = data.intent.strip().upper().replace("-", "_").replace(" ", "_") or "WAKE_UP"
    
    # Build profile dict for Gemini personalization
    user_profile = {
        "timezone": profile_record.timezone,
        "productivity_goal": profile_record.productivity_goal or "general wellness",
        "habit_preferences": profile_record.habit_preferences or [],
        "difficulty_preference": profile_record.difficulty_preference,
        "preferred_wake_time": profile_record.preferred_wake_time.strftime("%H:%M") if profile_record.preferred_wake_time else None,
    }
    
    # Generate challenge with Gemini fallback to deterministic
    prompt, expected_answer, instructions, source = generate_challenge_with_gemini(
        challenge_type, difficulty, intent, user_profile
    )
    options = challenge_options(challenge_type, normalize_answer(expected_answer), secrets.token_urlsafe(12), difficulty)

    created_at = datetime.now(timezone.utc)
    limit = challenge_time_limit(difficulty)
    if data.alarm_id is not None:
        alarm_for_challenge = owned_alarm(data.alarm_id, user, db)
        if alarm_for_challenge.status not in {"ACTIVE", "RINGING"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Alarm is not available for a wake challenge",
            )

    challenge = ChallengeAttempt(
        user_id=user.id,
        alarm_id=data.alarm_id,
        challenge_type=challenge_type,
        difficulty=difficulty,
        intent=intent,
        prompt=prompt,
        expected_answer=normalize_answer(expected_answer),
        options=options,
        status=ACTIVE_CHALLENGE_STATUS,
        max_attempts=challenge_max_attempts(difficulty),
        attempt_count=0,
        failed_attempts=0,
        time_limit_seconds=limit,
        expires_at=created_at + timedelta(seconds=limit),
        created_at=created_at,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    payload = challenge_public_payload(challenge, created_at, f"{type_reason} {difficulty_reason}")
    payload["instructions"] = instructions
    payload["source"] = source  # Include source for debugging/transparency
    return payload


def complete_challenge_attempt(challenge_id: int, data: ChallengeCompletionInput, user: User, db: Session):
    """Validate one answer while preserving the session for legitimate retries."""

    challenge = owned_challenge(challenge_id, user, db)
    if challenge.completed or challenge.status in CHALLENGE_TERMINAL_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This challenge is already closed")

    now = datetime.now(timezone.utc)
    if challenge.expires_at is None:
        challenge.expires_at = challenge_deadline(challenge)
    if now >= challenge_deadline(challenge):
        challenge.status = "TIMED_OUT"
        challenge.completed = True
        challenge.is_correct = False
        challenge.verification_passed = False
        challenge.elapsed_seconds = float(challenge.time_limit_seconds or challenge_time_limit(challenge.difficulty))
        challenge.completed_at = now
        db.commit()
        return challenge_validation_payload(challenge, now, "Time limit reached. The next selection will recalibrate to your pace.")

    challenge.attempt_count = int(challenge.attempt_count or 0) + 1
    challenge.submitted_answer = str(data.answer).strip()[:255]
    is_correct = normalize_answer(data.answer) == challenge.expected_answer
    challenge.is_correct = is_correct
    if is_correct:
        challenge.status = "SOLVED"
        challenge.completed = True
        challenge.verification_passed = challenge.intent == "WAKE_UP"
        challenge.elapsed_seconds = challenge_elapsed_seconds(challenge, now)
        challenge.completed_at = now
        insight = "Checkpoint complete. Your accuracy and pace will shape the next route."
    else:
        challenge.failed_attempts = int(challenge.failed_attempts or 0) + 1
        if challenge.attempt_count >= int(challenge.max_attempts or challenge_max_attempts(challenge.difficulty)):
            challenge.status = "FAILED"
            challenge.completed = True
            challenge.elapsed_seconds = challenge_elapsed_seconds(challenge, now)
            challenge.completed_at = now
            insight = "Attempts used. The next route will use this signal to find a better level."
        else:
            challenge.status = ACTIVE_CHALLENGE_STATUS
            challenge.completed = False
            insight = "Not quite. Use the hint and try again while the clock is live."
    db.commit()
    return challenge_validation_payload(challenge, now, insight)


@app.post("/challenge/{challenge_id}/complete", include_in_schema=False)
@app.post("/challenges/{challenge_id}/complete")
def complete_challenge(challenge_id: int, data: ChallengeCompletionInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return complete_challenge_attempt(challenge_id, data, user, db)


@app.post("/challenge/{challenge_id}/validate", include_in_schema=False)
@app.post("/challenges/{challenge_id}/validate")
def validate_challenge(challenge_id: int, data: ChallengeCompletionInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return complete_challenge_attempt(challenge_id, data, user, db)


def performance_payload(attempts: list[ChallengeAttempt]) -> dict:
    metrics = challenge_metrics(attempts)
    highest = metrics["highest_solved_level"]
    rating = user_performance_rating(metrics)
    return {
        "completed": metrics["completed"],
        "correct": metrics["correct"],
        "accuracy_percent": round(metrics["accuracy"] * 100, 1),
        "average_completion_seconds": round(metrics["average_seconds"], 2) if metrics["average_seconds"] is not None else None,
        "median_speed_percent_of_limit": round(metrics["median_speed_ratio"] * 100, 1) if metrics["median_speed_ratio"] is not None else None,
        "failed_attempts": sum(int(attempt.failed_attempts or 0) for attempt in attempts),
        "average_failed_attempts": round(metrics["average_failed_attempts"], 2),
        "failure_streak": metrics["failure_streak"],
        "highest_completed_difficulty": DIFFICULTY_LEVELS[highest] if highest is not None else None,
        "user_rating": rating["score"],
        "user_rating_label": rating["label"],
        "user_rating_stars": rating["stars"],
    }


@app.get("/challenges/performance")
def challenge_performance(user: User = Depends(current_user), db: Session = Depends(db_session)):
    attempts = list(
        db.scalars(
            select(ChallengeAttempt)
            .where(ChallengeAttempt.user_id == user.id, ChallengeAttempt.completed.is_(True))
            .order_by(ChallengeAttempt.completed_at.desc(), ChallengeAttempt.created_at.desc())
        ).all()
    )
    profile_record = ensure_profile(user, db)
    suggested_type, type_reason = choose_challenge_type(user.id, None, db)
    suggested_difficulty, difficulty_reason = choose_challenge_difficulty(profile_record, user.id, suggested_type, None, db)
    overall = performance_payload(attempts)
    return {
        "completed_count": overall["completed"],
        "correct_count": overall["correct"],
        "accuracy_percent": overall["accuracy_percent"],
        "average_completion_seconds": overall["average_completion_seconds"],
        "failed_attempts": overall["failed_attempts"],
        "failure_streak": overall["failure_streak"],
        "by_type": {challenge_type: performance_payload([attempt for attempt in attempts if attempt.challenge_type == challenge_type]) for challenge_type in CHALLENGE_TYPES},
        "by_difficulty": {difficulty: performance_payload([attempt for attempt in attempts if attempt.difficulty == difficulty]) for difficulty in DIFFICULTY_LEVELS},
        "recommendation": {
            "challenge_type": suggested_type,
            "difficulty": suggested_difficulty,
            "reason": f"{type_reason} {difficulty_reason}",
        },
    }


@app.post("/sleep", status_code=status.HTTP_201_CREATED)
def log_sleep(data: SleepInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    if data.wake_time <= data.sleep_time:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="wake_time must be after sleep_time")
    record = SleepLog(user_id=user.id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record



def _analytics_day(moment: datetime | None) -> object | None:
    if moment is None:
        return None
    try:
        return as_utc(moment).date()
    except (AttributeError, TypeError):
        return None


def _safe_correlation(pairs: list[tuple[float, float]]) -> float | None:
    """Pearson correlation for small, real observed datasets; returns None when undefined."""
    if len(pairs) < 3:
        return None
    xs = [float(x) for x, _ in pairs]
    ys = [float(y) for _, y in pairs]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in pairs)
    denom_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs))
    denom_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys))
    if denom_x == 0 or denom_y == 0:
        return None
    return round(numerator / (denom_x * denom_y), 2)


def _group_wake_sessions(attempts: list[ChallengeAttempt]) -> list[list[ChallengeAttempt]]:
    """Group WAKE_UP attempts (ordered by completed_at ascending) into wake sessions:
    consecutive attempts on the same alarm within 5 minutes of each other count as
    one wake-up, so a multi-step or retried verification isn't miscounted as several."""
    sessions: list[list[ChallengeAttempt]] = []

    for attempt in attempts:
        attempt_time = as_utc(attempt.completed_at)

        if not sessions:
            sessions.append([attempt])
            continue

        previous = sessions[-1][-1]
        previous_time = as_utc(previous.completed_at)

        same_alarm = (
            attempt.alarm_id is not None
            and previous.alarm_id == attempt.alarm_id
        )

        close_in_time = (
            attempt_time is not None
            and previous_time is not None
            and attempt_time - previous_time <= timedelta(minutes=5)
        )

        if same_alarm and close_in_time:
            sessions[-1].append(attempt)
        else:
            sessions.append([attempt])

    return sessions


def wake_behavior_metrics(
    user_id: int,
    db: Session,
    now: datetime | None = None,
) -> dict:
    """Summarize wake behavior by grouping consecutive challenge attempts into wake sessions."""

    current = as_utc(now or datetime.now(timezone.utc))
    cutoff = current - timedelta(days=7)

    wake_attempts = list(
        db.scalars(
            select(ChallengeAttempt)
            .where(
                ChallengeAttempt.user_id == user_id,
                ChallengeAttempt.intent == "WAKE_UP",
                ChallengeAttempt.completed.is_(True),
                ChallengeAttempt.completed_at.is_not(None),
                ChallengeAttempt.completed_at >= cutoff,
            )
            .order_by(ChallengeAttempt.completed_at.asc())
        ).all()
    )

    sessions = _group_wake_sessions(wake_attempts)

    successful_sessions = []
    failed_sessions = []

    for session in sessions:
        if any(
            bool(attempt.is_correct)
            and bool(attempt.verification_passed)
            for attempt in session
        ):
            successful_sessions.append(session)
        else:
            failed_sessions.append(session)

    verification_times = []
    challenge_attempt_counts = []

    for session in successful_sessions:
        elapsed_values = [
            float(attempt.elapsed_seconds)
            for attempt in session
            if attempt.elapsed_seconds is not None
        ]

        if elapsed_values:
            # For a multi-step wake, use total elapsed challenge time.
            verification_times.append(sum(elapsed_values))

        challenge_attempt_counts.append(
            sum(max(1, int(attempt.attempt_count or 0)) for attempt in session)
        )

    successful_days = {
        _analytics_day(session[-1].completed_at)
        for session in successful_sessions
        if session and _analytics_day(session[-1].completed_at) is not None
    }

    observed_days = {
        _analytics_day(session[-1].completed_at)
        for session in sessions
        if session and _analytics_day(session[-1].completed_at) is not None
    }
    wake_success_rate = (
    round((len(successful_sessions) / len(sessions)) * 100)
    if sessions
    else 0
)
    return {
        "window_days": 7,
        "successful_wakes": len(successful_sessions),
        "wake_challenge_failures": len(failed_sessions),
        "observed_wake_checks": len(sessions),
        "observed_wake_sessions": len(sessions),
        "average_verification_seconds": (
            round(sum(verification_times) / len(verification_times), 2)
            if verification_times
            else None
        ),
        "average_challenge_attempts": (
            round(
                sum(challenge_attempt_counts)
                / len(challenge_attempt_counts),
                2,
            )
            if challenge_attempt_counts
            else None
        ),
        "successful_wake_days": len(successful_days),
        "observed_wake_days": len(observed_days),
        "wake_consistency_percent": (
    round((len(successful_sessions) / len(sessions)) * 100)
    if sessions
    else 0
),
        "wake_success_rate_percent": wake_success_rate,
    }


def habit_consistency_metrics(user_id: int, db: Session, now: datetime | None = None) -> dict:
    """Use the existing Mission activity as the project's measurable routine/habit signal."""
    current = as_utc(now or datetime.now(timezone.utc))
    cutoff = current - timedelta(days=7)

    missions = list(
        db.scalars(
            select(Mission)
            .where(
                Mission.user_id == user_id,
                Mission.created_at.is_not(None),
                Mission.created_at >= cutoff,
            )
            .order_by(Mission.created_at.asc())
        ).all()
    )

    tracked_days = {
        _analytics_day(mission.created_at)
        for mission in missions
        if _analytics_day(mission.created_at) is not None
    }
    completed_days = {
        _analytics_day(mission.completed_at)
        for mission in missions
        if mission.completed and _analytics_day(mission.completed_at) is not None
    }

    completion_rate = (
        round((sum(1 for mission in missions if mission.completed) / len(missions)) * 100)
        if missions else 0
    )

    return {
        "window_days": 7,
        "missions_tracked": len(missions),
        "missions_completed": sum(1 for mission in missions if mission.completed),
        "tracked_days": len(tracked_days),
        "consistent_days": len(completed_days),
        "consistency_percent": round((len(completed_days) / len(tracked_days)) * 100) if tracked_days else 0,
        "completion_rate_percent": completion_rate,
        "basis": "completed missions across active routine days",
    }


def sleep_pattern_metrics(user_id: int, db: Session, now: datetime | None = None) -> dict:
    """Analyze stored sleep logs for duration, quality, and regularity."""
    current = as_utc(now or datetime.now(timezone.utc))
    cutoff = current - timedelta(days=7)
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))

    records = list(
        db.scalars(
            select(SleepLog)
            .where(
                SleepLog.user_id == user_id,
                SleepLog.wake_time >= cutoff,
            )
            .order_by(SleepLog.wake_time.desc())
            .limit(14)
        ).all()
    )

    durations_minutes = []
    qualities = []
    bedtime_minutes = []
    target_minutes = int(profile.target_sleep_duration_minutes or 480) if profile else 480

    for record in records:
        try:
            duration = (as_utc(record.wake_time) - as_utc(record.sleep_time)).total_seconds() / 60
        except (TypeError, AttributeError):
            continue
        if duration <= 0 or duration > 24 * 60:
            continue
        durations_minutes.append(duration)
        qualities.append(float(record.quality))
        local_sleep = as_utc(record.sleep_time)
        bedtime_minutes.append(local_sleep.hour * 60 + local_sleep.minute)

    if durations_minutes:
        average_duration = sum(durations_minutes) / len(durations_minutes)
        variance = sum((value - average_duration) ** 2 for value in durations_minutes) / len(durations_minutes)
        duration_std = math.sqrt(variance)
        on_target = sum(abs(value - target_minutes) <= 60 for value in durations_minutes)
        duration_consistency = round((on_target / len(durations_minutes)) * 100)
    else:
        average_duration = duration_std = None
        duration_consistency = 0

    bedtime_std = None
    if len(bedtime_minutes) >= 2:
        bedtime_mean = sum(bedtime_minutes) / len(bedtime_minutes)
        bedtime_std = round(
            math.sqrt(
                sum((value - bedtime_mean) ** 2 for value in bedtime_minutes) / len(bedtime_minutes)
            ),
            1,
        )

    return {
        "window_days": 7,
        "records": len(records),
        "average_sleep_hours": round(average_duration / 60, 2) if average_duration is not None else None,
        "average_sleep_quality": round(sum(qualities) / len(qualities), 1) if qualities else None,
        "duration_std_minutes": round(duration_std, 1) if duration_std is not None else None,
        "bedtime_variability_minutes": bedtime_std,
        "target_sleep_hours": round(target_minutes / 60, 1),
        "duration_consistency_percent": duration_consistency,
        "latest_quality": round(qualities[0], 1) if qualities else None,
    }


def productivity_correlation_metrics(
    user_id: int,
    db: Session,
    now: datetime | None = None,
) -> dict:
    """Measure observed daily relationships with the project's stored productivity/focus score."""
    current = as_utc(now or datetime.now(timezone.utc))
    cutoff = current - timedelta(days=30)

    analytics_rows = list(
        db.scalars(
            select(Analytics)
            .where(
                Analytics.user_id == user_id,
                Analytics.recorded_at >= cutoff,
            )
            .order_by(Analytics.recorded_at.asc())
        ).all()
    )
    sleep_rows = list(
        db.scalars(
            select(SleepLog)
            .where(
                SleepLog.user_id == user_id,
                SleepLog.wake_time >= cutoff,
            ).order_by(SleepLog.wake_time.asc())
        ).all()
    )
    snooze_rows = list(
        db.scalars(
            select(SnoozeEvent)
            .where(
                SnoozeEvent.user_id == user_id,
                SnoozeEvent.snoozed_at >= cutoff,
            ).order_by(SnoozeEvent.snoozed_at.asc())
        ).all()
    )

    productivity_by_day: dict[object, float] = {}
    for record in analytics_rows:
        day = _analytics_day(record.recorded_at)
        if day is not None:
            productivity_by_day[day] = float(record.focus_score)

    sleep_by_day: dict[object, list[float]] = defaultdict(list)
    for record in sleep_rows:
        day = _analytics_day(record.wake_time)
        if day is not None:
            sleep_by_day[day].append(float(record.quality))

    snooze_by_day: dict[object, int] = defaultdict(int)
    for event in snooze_rows:
        day = _analytics_day(event.snoozed_at)
        if day is not None:
            snooze_by_day[day] += 1

    sleep_pairs = [
    (
        sum(sleep_by_day[day]) / len(sleep_by_day[day]),
        productivity_by_day[day],
    )
    for day in sorted(productivity_by_day)
    if day in sleep_by_day and sleep_by_day[day]
    ]
    snooze_pairs = [
    (
        float(snooze_by_day.get(day, 0)),
        productivity_by_day[day],
    )
    for day in sorted(productivity_by_day)
    ]

    sleep_corr = _safe_correlation(sleep_pairs)
    snooze_corr = _safe_correlation(snooze_pairs)

    return {
        "window_days": 30,
        "productivity_score": round(productivity_by_day[max(productivity_by_day)])
        if productivity_by_day else 0,
        "sleep_quality_vs_productivity": sleep_corr,
        "snooze_count_vs_productivity": snooze_corr,
        "sleep_productivity_samples": len(sleep_pairs),
        "snooze_productivity_samples": len(snooze_pairs),
        "interpretation": "Observed correlation only; correlation does not prove causation.",
    }


HABIT_SCORE_WEIGHTS = {
    "wake_up_consistency": 0.35,
    "challenge_completion_success": 0.25,
    "snooze_reduction": 0.20,
    "sleep_schedule_adherence": 0.20,
}


def _bounded_score(value: float | int | None) -> float | None:
    if value is None:
        return None
    return round(max(0.0, min(100.0, float(value))), 2)


def snooze_reduction_score(recent: int, previous: int) -> float:
    """Score this component as the *better* of two signals: how little you're
    snoozing right now (absolute), and how much you've improved versus the
    prior week (relative). A pure week-over-week comparison would otherwise
    score a consistently-low snoozer identically to a consistently-bad one -
    both show 0% "reduction" - so a stable good habit gets no credit for
    already being good. Taking the max of both signals fixes that without
    losing credit for genuine improvement from a bad baseline.
    """
    absolute_score = max(0.0, 100 - recent * 20)
    if previous:
        improvement_score = max(0.0, min(100.0, (previous - recent) / previous * 100))
        return max(absolute_score, improvement_score)
    return absolute_score


def habit_score_payload(user_id: int, db: Session, now: datetime | None = None) -> dict:
    """Calculate the weighted habit score only from observed records."""
    current = as_utc(now or datetime.now(timezone.utc))
    wake = wake_behavior_metrics(user_id, db, current)
    sleep = sleep_pattern_metrics(user_id, db, current)
    attempts = list(db.scalars(select(ChallengeAttempt).where(
        ChallengeAttempt.user_id == user_id,
        ChallengeAttempt.completed.is_(True),
    )).all())
    snoozes = list(db.scalars(select(SnoozeEvent).where(
        SnoozeEvent.user_id == user_id,
        SnoozeEvent.snoozed_at >= current - timedelta(days=14),
    )).all())
    recent = sum(as_utc(event.snoozed_at) >= current - timedelta(days=7) for event in snoozes)
    previous = sum(as_utc(event.snoozed_at) < current - timedelta(days=7) for event in snoozes)

    components = {
        "wake_up_consistency": _bounded_score(wake["wake_consistency_percent"] if wake["observed_wake_sessions"] else None),
        "challenge_completion_success": _bounded_score(
            (sum(bool(attempt.verification_passed) for attempt in attempts) / len(attempts)) * 100
            if attempts else None
        ),
        "snooze_reduction": _bounded_score(
            snooze_reduction_score(recent, previous)
            if snoozes or wake["observed_wake_sessions"] else None
        ),
        "sleep_schedule_adherence": _bounded_score(
            sleep["duration_consistency_percent"] if sleep["records"] else None
        ),
    }
    available_weight = sum(
        HABIT_SCORE_WEIGHTS[name] for name, value in components.items() if value is not None
    )
    final_score = (
        round(sum(value * HABIT_SCORE_WEIGHTS[name] for name, value in components.items() if value is not None) / available_weight, 2)
        if available_weight else None
    )
    return {
        "score": final_score,
        "components": components,
        "weights": HABIT_SCORE_WEIGHTS,
        "available_weight": round(available_weight, 2),
        "data_window_days": 14,
        "basis": "Observed wake, challenge, snooze, and sleep records; unavailable components are excluded.",
    }


def recommendation_payload(user_id: int, db: Session, now: datetime | None = None) -> dict:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    analytics = behavioral_analytics_payload(user_id, db, now)
    performance = performance_payload(list(db.scalars(select(ChallengeAttempt).where(
        ChallengeAttempt.user_id == user_id,
        ChallengeAttempt.completed.is_(True),
    )).all()))
    recommendations: dict[str, list[dict]] = {
        "sleep_improvement": [],
        "wake_optimization": [],
        "habit_improvement": [],
        "productivity": [],
        "personalized_challenges": [],
    }
    sleep = analytics["sleep_patterns"]
    if sleep["records"]:
        if sleep["average_sleep_hours"] is not None and sleep["target_sleep_hours"] is not None and sleep["average_sleep_hours"] < sleep["target_sleep_hours"]:
            recommendations["sleep_improvement"].append({
                "message": f"Your observed average is {sleep['average_sleep_hours']} hours versus a {sleep['target_sleep_hours']}-hour target.",
                "evidence": "sleep_patterns.average_sleep_hours",
                "action": "Move bedtime earlier gradually and log the next wake window.",
            })
        if sleep["duration_consistency_percent"] < 80:
            recommendations["sleep_improvement"].append({
                "message": "Your logged sleep duration is varying across the recent window.",
                "evidence": "sleep_patterns.duration_consistency_percent",
                "action": "Keep sleep and wake times within a consistent window.",
            })
    wake = analytics["wake_behavior"]
    if wake["observed_wake_sessions"]:
        if wake["wake_success_rate_percent"] < 80:
            recommendations["wake_optimization"].append({
                "message": f"Verified wake success is {wake['wake_success_rate_percent']}% across observed sessions.",
                "evidence": "wake_behavior.wake_success_rate_percent",
                "action": "Keep the challenge difficulty steady until verification becomes reliable.",
            })
        if analytics["snooze_patterns"]["recent_7_day_snoozes"]:
            recommendations["wake_optimization"].append({
                "message": f"{analytics['snooze_patterns']['recent_7_day_snoozes']} snooze events were recorded in the last 7 days.",
                "evidence": "snooze_patterns.recent_7_day_snoozes",
                "action": "Use the configured wake window and stand before deciding to snooze.",
            })
    habit = analytics["habit_consistency"]
    if not habit["missions_tracked"]:
        recommendations["habit_improvement"].append({
            "message": "No missions have been tracked in the last 7 days.",
            "evidence": "habit_consistency.missions_tracked",
            "action": "Choose one repeatable mission to start building a routine signal.",
        })
    elif habit["completion_rate_percent"] < 80:
        recommendations["habit_improvement"].append({
            "message": f"{habit['completion_rate_percent']}% of tracked missions were completed.",
            "evidence": "habit_consistency.completion_rate_percent",
            "action": "Choose one repeatable mission for the next route.",
        })
    productivity = analytics["productivity_correlation"]
    if 0 < productivity["productivity_score"] < 70:
        recommendations["productivity"].append({
            "message": f"Your latest stored focus score is {productivity['productivity_score']}.",
            "evidence": "productivity_correlation.productivity_score",
            "action": (profile.productivity_goal if profile and profile.productivity_goal else "Protect one focused block after verification."),
            "note": "Observed association is not evidence of causation.",
        })
    challenge = performance.get("recommendation")
    if challenge:
        recommendations["personalized_challenges"].append({
            "message": f"Adaptive selection favors {challenge['challenge_type']} at {challenge['difficulty']} based on challenge performance.",
            "evidence": "challenge_performance",
            "action": "Use the suggested checkpoint on the next wake route.",
            "challenge_type": challenge["challenge_type"],
            "difficulty": challenge["difficulty"],
            "reason": challenge["reason"],
        })
    return recommendations


def _metric_rows(items) -> list[dict]:
    """Build human-readable {Metric, Value} rows from raw (key, value) pairs,
    e.g. ("wake_up_consistency", 100.0) -> {"metric": "Wake-Up Consistency", "value": "100.0%"}."""
    return [{"metric": _report_field_label(key), "value": _report_field_value(key, value)} for key, value in items]


def _report_rows(user_id: int, report_type: str, db: Session) -> list[dict]:
    report_type = report_type.lower()
    if report_type not in {"habit", "wake", "challenge", "productivity", "sleep"}:
        raise HTTPException(status_code=404, detail="Unknown report type")
    analytics = behavioral_analytics_payload(user_id, db)
    if report_type == "habit":
        score = habit_score_payload(user_id, db)
        return _metric_rows(list(score["components"].items()) + [("final_score", score["score"])])
    if report_type == "wake":
        return _metric_rows(analytics["wake_behavior"].items())
    if report_type == "challenge":
        return _metric_rows(performance_payload(list(db.scalars(select(ChallengeAttempt).where(ChallengeAttempt.user_id == user_id, ChallengeAttempt.completed.is_(True))).all())).items())
    if report_type == "productivity":
        return _metric_rows(analytics["productivity_correlation"].items())
    return _metric_rows(analytics["sleep_patterns"].items())


_REPORT_FIELD_LABELS = {
    # Habit score
    "wake_up_consistency": "Wake-Up Consistency",
    "challenge_completion_success": "Challenge Completion Success",
    "snooze_reduction": "Snooze Reduction",
    "sleep_schedule_adherence": "Sleep Schedule Adherence",
    "final_score": "Final Habit Score",
    # Wake behavior
    "window_days": "Observation Window (days)",
    "successful_wakes": "Successful Wakes",
    "wake_challenge_failures": "Wake Challenge Failures",
    "observed_wake_checks": "Observed Wake Checks",
    "observed_wake_sessions": "Observed Wake Sessions",
    "average_verification_seconds": "Avg Verification Time",
    "average_challenge_attempts": "Avg Challenge Attempts",
    "successful_wake_days": "Successful Wake Days",
    "observed_wake_days": "Observed Wake Days",
    "wake_consistency_percent": "Wake Consistency",
    "wake_success_rate_percent": "Wake Success Rate",
    # Challenge performance
    "completed": "Completed",
    "correct": "Correct",
    "accuracy_percent": "Accuracy",
    "average_completion_seconds": "Avg Completion Time",
    "median_speed_percent_of_limit": "Median Speed (% of limit)",
    "failed_attempts": "Failed Attempts",
    "average_failed_attempts": "Avg Failed Attempts",
    "failure_streak": "Current Failure Streak",
    "highest_completed_difficulty": "Highest Difficulty Completed",
    "user_rating": "Performance Rating",
    "user_rating_label": "Rating Label",
    "user_rating_stars": "Rating (Stars)",
    # Productivity correlation
    "productivity_score": "Productivity Score",
    "sleep_quality_vs_productivity": "Sleep Quality vs Productivity (correlation)",
    "snooze_count_vs_productivity": "Snooze Count vs Productivity (correlation)",
    "sleep_productivity_samples": "Sleep/Productivity Samples",
    "snooze_productivity_samples": "Snooze/Productivity Samples",
    "interpretation": "Interpretation",
    # Sleep patterns
    "records": "Sleep Records",
    "average_sleep_hours": "Avg Sleep Duration (hrs)",
    "average_sleep_quality": "Avg Sleep Quality",
    "duration_std_minutes": "Sleep Duration Variability (min)",
    "bedtime_variability_minutes": "Bedtime Variability (min)",
    "target_sleep_hours": "Target Sleep Duration (hrs)",
    "duration_consistency_percent": "Sleep Duration Consistency",
    "latest_quality": "Latest Sleep Quality",
    # Admin: users / platform summary
    "id": "ID",
    "name": "Name",
    "email": "Email",
    "role": "Role",
    "provider": "Sign-in Provider",
    "created_at": "Created At",
    "total_users": "Total Users",
    "admins": "Admins",
    "wellness_coaches": "Wellness Coaches",
    "active_alarms": "Active Alarms",
    "completed_challenges": "Completed Challenges",
    "notifications_sent": "Notifications Sent",
    "coach_notes_recorded": "Coach Notes Recorded",
    # Generic
    "metric": "Metric",
    "value": "Value",
}
_REPORT_PERCENT_FIELDS = {
    "accuracy_percent", "wake_consistency_percent", "wake_success_rate_percent",
    "duration_consistency_percent", "median_speed_percent_of_limit",
    "wake_up_consistency", "challenge_completion_success", "snooze_reduction",
    "sleep_schedule_adherence", "productivity_score", "average_sleep_quality", "latest_quality",
}
_REPORT_SECONDS_FIELDS = {"average_verification_seconds", "average_completion_seconds"}
_REPORT_OUT_OF_100_FIELDS = {"final_score"}
_REPORT_ACCENT_COLOR = "0EA5B5"
_REPORT_STRIPE_COLOR = "F5F7FA"
_REPORT_INK_COLOR = "0B1220"


def _report_field_label(key: str) -> str:
    return _REPORT_FIELD_LABELS.get(key, key.replace("_", " ").title())


def _report_field_value(key: str, value: object) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, datetime):
        return as_utc(value).strftime("%Y-%m-%d %H:%M UTC")
    if isinstance(value, float):
        value = round(value, 2)
    if key in _REPORT_PERCENT_FIELDS and isinstance(value, (int, float)):
        return f"{value}%"
    if key in _REPORT_SECONDS_FIELDS and isinstance(value, (int, float)):
        return f"{value}s"
    if key in _REPORT_OUT_OF_100_FIELDS and isinstance(value, (int, float)):
        return f"{value}/100"
    return str(value)


def _xlsx_bytes(rows: list[dict], title: str = "BrainOS Report", subtitle: str = "") -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = (title[:31] or "Report")

    columns = list(rows[0].keys()) if rows else ["metric", "value"]
    header_labels = [_report_field_label(column) for column in columns]

    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max(1, len(columns)))
    title_cell = sheet.cell(row=1, column=1, value=title)
    title_cell.font = Font(size=16, bold=True, color=_REPORT_INK_COLOR)

    if subtitle:
        sheet.merge_cells(start_row=2, start_column=1, end_row=2, end_column=max(1, len(columns)))
        subtitle_cell = sheet.cell(row=2, column=1, value=subtitle)
        subtitle_cell.font = Font(size=10, italic=True, color="666666")

    header_row = 4
    header_fill = PatternFill("solid", fgColor=_REPORT_ACCENT_COLOR)
    stripe_fill = PatternFill("solid", fgColor=_REPORT_STRIPE_COLOR)
    thin_border = Border(*(Side(style="thin", color="D9D9D9") for _ in range(4)))

    for column_index, label in enumerate(header_labels, start=1):
        cell = sheet.cell(row=header_row, column=column_index, value=label)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    for row_offset, row in enumerate(rows, start=1):
        excel_row = header_row + row_offset
        for column_index, column_key in enumerate(columns, start=1):
            cell = sheet.cell(row=excel_row, column=column_index, value=_report_field_value(column_key, row.get(column_key)))
            cell.border = thin_border
            if row_offset % 2 == 0:
                cell.fill = stripe_fill

    if not rows:
        sheet.cell(row=header_row + 1, column=1, value="No data recorded yet.").font = Font(italic=True, color="777777")

    for column_index, column_key in enumerate(columns, start=1):
        widest = max([len(header_labels[column_index - 1])] + [len(_report_field_value(column_key, row.get(column_key))) for row in rows] or [10])
        sheet.column_dimensions[get_column_letter(column_index)].width = min(45, max(14, widest + 3))

    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def _pdf_bytes(rows: list[dict], title: str, subtitle: str = "") -> bytes:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("BrainOSTitle", parent=styles["Heading1"], textColor=colors.HexColor(f"#{_REPORT_INK_COLOR}"), spaceAfter=4)
    subtitle_style = ParagraphStyle("BrainOSSubtitle", parent=styles["Normal"], textColor=colors.HexColor("#666666"), spaceAfter=18)

    story = [Paragraph(title, title_style)]
    story.append(Paragraph(subtitle, subtitle_style) if subtitle else Spacer(1, 14))

    columns = list(rows[0].keys()) if rows else ["metric", "value"]
    header_labels = [_report_field_label(column) for column in columns]
    table_data = [header_labels]
    for row in rows:
        table_data.append([_report_field_value(column, row.get(column)) for column in columns])
    if not rows:
        table_data.append(["No data recorded yet."] + [""] * (len(columns) - 1))

    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{_REPORT_ACCENT_COLOR}")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(f"#{_REPORT_STRIPE_COLOR}")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(table)

    document.build(story)
    return buffer.getvalue()


def behavioral_analytics_payload(user_id: int, db: Session, now: datetime | None = None) -> dict:
    return {
        "snooze_patterns": snooze_pattern_metrics(user_id, db, now),
        "wake_behavior": wake_behavior_metrics(user_id, db, now),
        "productivity_correlation": productivity_correlation_metrics(user_id, db, now),
        "habit_consistency": habit_consistency_metrics(user_id, db, now),
        "sleep_patterns": sleep_pattern_metrics(user_id, db, now),
    }


NOTIFICATION_REFRESH_HOURS = 20


def _notification_records(user: User, db: Session) -> list[dict]:
    """Evaluate reminder conditions and persist any that haven't fired recently.

    Runs on every call (not just once ever) so this behaves like a real
    recurring reminder system: each notification type is re-checked and, if
    still true, gets a fresh row at most once per NOTIFICATION_REFRESH_HOURS -
    frequent enough to feel live, not so frequent it spams duplicates.
    """
    analytics = behavioral_analytics_payload(user.id, db)
    score = habit_score_payload(user.id, db)
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    now = datetime.now(timezone.utc)

    candidates = []
    if profile and profile.preferred_wake_time:
        candidates.append(("BEDTIME_REMINDER", "Bedtime reminder", f"Protect the sleep window before your {profile.preferred_wake_time.strftime('%H:%M')} wake target."))
    if db.scalar(select(Alarm.alarm_id).where(Alarm.user_id == user.id, Alarm.status == "ACTIVE")):
        candidates.append(("WAKE_REMINDER", "Wake route ready", "Your next active alarm will require challenge verification before dismiss or snooze."))
    if analytics["habit_consistency"]["missions_tracked"] and analytics["habit_consistency"]["completion_rate_percent"] < 70:
        candidates.append(("HABIT_ALERT", "Habit signal", "Your observed mission completion is below 70%; choose one smaller repeatable mission."))
    if db.scalar(select(ChallengeAttempt.challenge_id).where(ChallengeAttempt.user_id == user.id, ChallengeAttempt.status == ACTIVE_CHALLENGE_STATUS)):
        candidates.append(("CHALLENGE_REMINDER", "Checkpoint waiting", "You have an active cognitive checkpoint that still needs an answer."))
    if score["score"] is not None:
        candidates.append(("PROGRESS", "Habit score updated", f"Your observed weighted habit score is {score['score']}/100."))

    recently_notified_types = set(
        db.scalars(
            select(Notification.notification_type).where(
                Notification.user_id == user.id,
                Notification.created_at >= now - timedelta(hours=NOTIFICATION_REFRESH_HOURS),
            )
        ).all()
    )
    new_records = [
        Notification(user_id=user.id, notification_type=notification_type, title=title, message=message)
        for notification_type, title, message in candidates
        if notification_type not in recently_notified_types
    ]
    if new_records:
        db.add_all(new_records)
        db.commit()

    records = list(db.scalars(select(Notification).where(
        Notification.user_id == user.id,
    ).order_by(Notification.created_at.desc()).limit(50)).all())
    return [{
        "notification_id": item.notification_id,
        "type": item.notification_type,
        "title": item.title,
        "message": item.message,
        "read": item.read,
        "created_at": item.created_at,
    } for item in records]


def user_device_tokens(user_id: int, db: Session) -> list[str]:
    return list(db.scalars(select(DeviceToken.token).where(DeviceToken.user_id == user_id)).all())


@app.get("/notifications")
def notifications(user: User = Depends(current_user), db: Session = Depends(db_session)):
    return _notification_records(user, db)


@app.post("/notifications/device-tokens", status_code=status.HTTP_201_CREATED)
def register_device_token(data: DeviceTokenInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    existing = db.scalar(select(DeviceToken).where(DeviceToken.token == data.token))
    if existing:
        existing.user_id = user.id
        existing.platform = data.platform.upper()
    else:
        db.add(DeviceToken(user_id=user.id, token=data.token, platform=data.platform.upper()))
    db.commit()
    return {"registered": True, "push_enabled": get_fcm_service().enabled}


@app.delete("/notifications/device-tokens/{token}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_device_token(token: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    record = db.scalar(select(DeviceToken).where(DeviceToken.token == token, DeviceToken.user_id == user.id))
    if record:
        db.delete(record)
        db.commit()


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    record = db.scalar(select(Notification).where(
        Notification.notification_id == notification_id,
        Notification.user_id == user.id,
    ))
    if not record:
        raise HTTPException(status_code=404, detail="Notification not found")
    record.read = True
    db.commit()
    return {"notification_id": record.notification_id, "read": True}


@app.post("/admin/announcements", status_code=status.HTTP_201_CREATED)
def create_announcement(
    data: AnnouncementInput,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    users = db.scalars(select(User.id)).all()
    db.add_all([
        Notification(
            user_id=user_id,
            notification_type="PLATFORM_ANNOUNCEMENT",
            title=data.title,
            message=data.message,
        )
        for user_id in users
    ])
    db.commit()
    all_tokens = list(db.scalars(select(DeviceToken.token)).all())
    push_result = get_fcm_service().send(
        all_tokens, title=data.title, body=data.message, data={"type": "PLATFORM_ANNOUNCEMENT"}
    )
    return {"recipients": len(users), "title": data.title, "push": push_result}


@app.get("/reports/{report_type}")
def download_report(
    report_type: str,
    format: str = Query(default="xlsx", pattern="^(xlsx|pdf)$"),
    target_user_id: int | None = Query(default=None, ge=1),
    user: User = Depends(current_user),
    db: Session = Depends(db_session),
):
    if target_user_id is not None and target_user_id != user.id and user.role not in {Role.ADMIN.value, Role.WELLNESS_COACH.value}:
        raise HTTPException(status_code=403, detail="You do not have permission to access this report")
    report_user_id = target_user_id or user.id
    report_user = db.get(User, report_user_id)
    if not report_user:
        raise HTTPException(status_code=404, detail="User not found")
    rows = _report_rows(report_user_id, report_type, db)
    title = f"BrainOS {report_type.title()} Report"
    subtitle = f"{report_user.name} · Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
    filename = f"brainos-{report_type}-report.{format}"
    if format == "pdf":
        content, media_type = _pdf_bytes(rows, title, subtitle), "application/pdf"
    else:
        content, media_type = _xlsx_bytes(rows, title, subtitle), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return StreamingResponse(io.BytesIO(content), media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


def _admin_report_rows(report_type: str, db: Session) -> list[dict]:
    report_type = report_type.lower()
    if report_type == "users":
        users = db.scalars(select(User).order_by(User.created_at.desc())).all()
        return [
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "provider": u.provider, "created_at": u.created_at}
            for u in users
        ]
    if report_type == "platform_summary":
        return _metric_rows({
            "total_users": db.scalar(select(func.count(User.id))) or 0,
            "admins": db.scalar(select(func.count(User.id)).where(User.role == Role.ADMIN.value)) or 0,
            "wellness_coaches": db.scalar(select(func.count(User.id)).where(User.role == Role.WELLNESS_COACH.value)) or 0,
            "active_alarms": db.scalar(select(func.count(Alarm.alarm_id)).where(Alarm.status == "ACTIVE")) or 0,
            "completed_challenges": db.scalar(select(func.count(ChallengeAttempt.challenge_id)).where(ChallengeAttempt.completed.is_(True))) or 0,
            "notifications_sent": db.scalar(select(func.count(Notification.notification_id))) or 0,
            "coach_notes_recorded": db.scalar(select(func.count(CoachNote.note_id))) or 0,
        }.items())
    raise HTTPException(status_code=404, detail="Unknown system report type")


@app.get("/admin/reports/{report_type}")
def download_admin_report(
    report_type: str,
    format: str = Query(default="xlsx", pattern="^(xlsx|pdf)$"),
    admin: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(db_session),
):
    rows = _admin_report_rows(report_type, db)
    title = f"BrainOS System {report_type.replace('_', ' ').title()} Report"
    subtitle = f"Requested by {admin.name} · Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
    filename = f"brainos-system-{report_type}-report.{format}"
    if format == "pdf":
        content, media_type = _pdf_bytes(rows, title, subtitle), "application/pdf"
    else:
        content, media_type = _xlsx_bytes(rows, title, subtitle), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return StreamingResponse(io.BytesIO(content), media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/coach/insights")
def coach_insights(coach: User = Depends(require_roles(Role.WELLNESS_COACH, Role.ADMIN)), db: Session = Depends(db_session)):
    if coach.role == Role.WELLNESS_COACH.value:
        member_ids = db.scalars(select(CoachAssignment.member_id).where(CoachAssignment.coach_id == coach.id)).all()
        users = db.scalars(select(User).where(User.id.in_(member_ids))).all() if member_ids else []
    else:
        users = db.scalars(select(User).where(User.role == Role.USER.value)).all()
    member_scores = {user.id: habit_score_payload(user.id, db)["score"] for user in users}
    scores = list(member_scores.values())
    note_counts = dict(
        db.execute(
            select(CoachNote.member_id, func.count(CoachNote.note_id)).group_by(CoachNote.member_id)
        ).all()
    )
    open_help_counts = dict(
        db.execute(
            select(CoachHelpMessage.member_id, func.count(CoachHelpMessage.message_id))
            .where(CoachHelpMessage.sender_role == "USER", CoachHelpMessage.read.is_(False))
            .group_by(CoachHelpMessage.member_id)
        ).all()
    )
    return {
        "users_tracked": len(users),
        "average_habit_score": round(sum(score for score in scores if score is not None) / len([score for score in scores if score is not None]), 2) if any(score is not None for score in scores) else None,
        "users": [
            {
                "user_id": user.id,
                "name": user.name,
                "habit_score": member_scores[user.id],
                "note_count": note_counts.get(user.id, 0),
                "open_help_requests": open_help_counts.get(user.id, 0),
                "analytics": behavioral_analytics_payload(user.id, db),
            }
            for user in users
        ],
    }


def owned_member_for_coach(user_id: int, coach: User, db: Session) -> User:
    member = db.get(User, user_id)
    if not member or member.role != Role.USER.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if coach.role == Role.WELLNESS_COACH.value:
        assignment = db.scalar(
            select(CoachAssignment).where(CoachAssignment.coach_id == coach.id, CoachAssignment.member_id == user_id)
        )
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


@app.get("/coach/members/{user_id}/notes")
def list_coach_notes(
    user_id: int,
    coach: User = Depends(require_roles(Role.WELLNESS_COACH, Role.ADMIN)),
    db: Session = Depends(db_session),
):
    owned_member_for_coach(user_id, coach, db)
    notes = db.scalars(
        select(CoachNote).where(CoachNote.member_id == user_id).order_by(CoachNote.created_at.desc())
    ).all()
    coach_names = {row.id: row.name for row in db.scalars(select(User).where(User.id.in_({note.coach_id for note in notes})))} if notes else {}
    return [
        {
            "note_id": note.note_id,
            "note": note.note,
            "coach_name": coach_names.get(note.coach_id, "Coach"),
            "created_at": note.created_at,
        }
        for note in notes
    ]


@app.post("/coach/members/{user_id}/notes", status_code=status.HTTP_201_CREATED)
def add_coach_note(
    user_id: int,
    data: CoachNoteInput,
    coach: User = Depends(require_roles(Role.WELLNESS_COACH, Role.ADMIN)),
    db: Session = Depends(db_session),
):
    owned_member_for_coach(user_id, coach, db)
    record = CoachNote(coach_id=coach.id, member_id=user_id, note=data.note.strip())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"note_id": record.note_id, "note": record.note, "coach_name": coach.name, "created_at": record.created_at}


@app.post("/coach/members/{user_id}/message", status_code=status.HTTP_201_CREATED)
def send_coach_message(
    user_id: int,
    data: CoachMessageInput,
    coach: User = Depends(require_roles(Role.WELLNESS_COACH, Role.ADMIN)),
    db: Session = Depends(db_session),
):
    member = owned_member_for_coach(user_id, coach, db)
    db.add(Notification(
        user_id=member.id,
        notification_type="COACH_MESSAGE",
        title=data.title,
        message=data.message,
    ))
    db.commit()
    tokens = user_device_tokens(member.id, db)
    push_result = get_fcm_service().send(tokens, title=data.title, body=data.message, data={"type": "COACH_MESSAGE"})
    return {"delivered_to": member.name, "push": push_result}


@app.get("/coach/members/{user_id}/help-messages")
def list_member_help_messages(
    user_id: int,
    coach: User = Depends(require_roles(Role.WELLNESS_COACH, Role.ADMIN)),
    db: Session = Depends(db_session),
):
    owned_member_for_coach(user_id, coach, db)
    messages = db.scalars(
        select(CoachHelpMessage).where(CoachHelpMessage.member_id == user_id).order_by(CoachHelpMessage.created_at)
    ).all()
    unread = [m for m in messages if m.sender_role == "USER" and not m.read]
    for message in unread:
        message.read = True
    if unread:
        db.commit()
    return [_serialize_help_message(m) for m in messages]


@app.post("/coach/members/{user_id}/help-messages", status_code=status.HTTP_201_CREATED)
def reply_to_member_help_message(
    user_id: int,
    data: CoachHelpMessageInput,
    coach: User = Depends(require_roles(Role.WELLNESS_COACH, Role.ADMIN)),
    db: Session = Depends(db_session),
):
    member = owned_member_for_coach(user_id, coach, db)
    content = data.message.strip()
    record = CoachHelpMessage(member_id=user_id, coach_id=coach.id, sender_role="COACH", content=content)
    db.add(record)
    db.add(Notification(
        user_id=member.id,
        notification_type="COACH_HELP_REPLY",
        title=f"{coach.name} replied",
        message=content,
    ))
    db.commit()
    db.refresh(record)
    tokens = user_device_tokens(member.id, db)
    push_result = get_fcm_service().send(tokens, title=f"{coach.name} replied", body=content, data={"type": "COACH_HELP_REPLY"})
    return {**_serialize_help_message(record), "push": push_result}


@app.get("/admin/analytics")
def admin_analytics(_: User = Depends(require_roles(Role.ADMIN)), db: Session = Depends(db_session)):
    return {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "active_alarms": db.scalar(select(func.count(Alarm.alarm_id)).where(Alarm.status == "ACTIVE")) or 0,
        "completed_challenges": db.scalar(select(func.count(ChallengeAttempt.challenge_id)).where(ChallengeAttempt.completed.is_(True))) or 0,
        "notifications": db.scalar(select(func.count(Notification.notification_id))) or 0,
    }


@app.get("/admin/recommendations")
def admin_recommendations(_: User = Depends(require_roles(Role.ADMIN)), db: Session = Depends(db_session)):
    users = db.scalars(select(User).where(User.role == Role.USER.value)).all()
    return {
        "users_tracked": len(users),
        "recommendations": [
            {"user_id": user.id, "recommendations": recommendation_payload(user.id, db)}
            for user in users
        ],
    }


@app.get("/analytics")
def analytics(user: User = Depends(current_user), db: Session = Depends(db_session)):
    records = list(
        db.scalars(
            select(Analytics)
            .where(Analytics.user_id == user.id)
            .order_by(Analytics.recorded_at.desc())
            .limit(7)
        ).all()
    )

    attempts = list(
        db.scalars(
            select(ChallengeAttempt)
            .where(
                ChallengeAttempt.user_id == user.id,
                ChallengeAttempt.completed.is_(True),
            )
            .order_by(ChallengeAttempt.completed_at.desc(), ChallengeAttempt.created_at.desc())
            .limit(20)
        ).all()
    )

    challenge_data = performance_payload(attempts)

    sleep_records = list(
        db.scalars(
            select(SleepLog)
            .where(SleepLog.user_id == user.id)
            .order_by(SleepLog.wake_time.desc())
            .limit(7)
        ).all()
    )

    if records:
        latest = records[0]
        focus_score = latest.focus_score
        habit_score = latest.habit_score
        sleep_score = latest.sleep_score
        history = [record.sleep_score for record in reversed(records)]
    else:
        sleep_score = (
            round(sum(float(record.quality) for record in sleep_records) / len(sleep_records))
            if sleep_records
            else 0
        )
        focus_score = round(challenge_data["accuracy_percent"]) if attempts else 0
        habit_score = 0
        history = [record.quality for record in reversed(sleep_records)]

    behavioral = behavioral_analytics_payload(user.id, db)

    return {
        "focus_score": focus_score,
        "habit_score": habit_score,
        "sleep_score": sleep_score,
        "history": history,
        "challenge_performance": challenge_data,
        "habit_score": habit_score_payload(user.id, db),
        "recommendations": recommendation_payload(user.id, db),
        **behavioral,
    }
