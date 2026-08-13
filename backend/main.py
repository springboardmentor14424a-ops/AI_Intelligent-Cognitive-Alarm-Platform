import hashlib
import math
import os
import re
import secrets
from datetime import datetime, time, timedelta, timezone
from enum import Enum
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.background import BackgroundScheduler
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text as SQLText, Time, create_engine, func, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

try:
    from .alarm_service import next_occurrence
except ImportError:  # Supports `uvicorn main:app` when running from backend/.
    from alarm_service import next_occurrence

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/brainos")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-before-production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SESSION_SECRET = os.getenv("SESSION_SECRET", JWT_SECRET)
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
    repeat_days: Mapped[str | None] = mapped_column(String(50), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(30), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    title: Mapped[str] = mapped_column(String(120), default="Wake mission")
    alarm_type: Mapped[str] = mapped_column(String(30), default="DAILY")
    sound: Mapped[str] = mapped_column(String(80), default="Neural Dawn")
    vibration: Mapped[bool] = mapped_column(Boolean, default=True)
    snooze_minutes: Mapped[int] = mapped_column(Integer, default=5)
    # Daybreak Route opens before the alarm and gives the user a short wake sequence.
    daybreak_route_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    wake_window_minutes: Mapped[int] = mapped_column(Integer, default=15)
    last_fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class Mission(Base):
    __tablename__ = "missions"

    mission_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    challenge_type: Mapped[str] = mapped_column(String(40))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    reward: Mapped[int] = mapped_column(Integer, default=180)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ChallengeAttempt(Base):
    """Server-side challenge state. The expected answer never leaves this table."""

    __tablename__ = "challenge_attempts"

    challenge_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    challenge_type: Mapped[str] = mapped_column(String(40))
    difficulty: Mapped[str] = mapped_column(String(30))
    intent: Mapped[str] = mapped_column(String(60))
    prompt: Mapped[str] = mapped_column(SQLText)
    expected_answer: Mapped[str] = mapped_column(String(255))
    submitted_answer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", index=True)
    max_attempts: Mapped[int] = mapped_column(Integer, default=2)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=75)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
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


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


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


class ChallengeGenerateInput(BaseModel):
    # Omit this (or use AUTO) to get a server-selected challenge type.
    challenge_type: str | None = Field(default=None, min_length=2, max_length=40)
    # `type` is accepted as a compact client-side alias for challenge_type.
    type: str | None = Field(default=None, min_length=2, max_length=40)
    difficulty: str | None = Field(default=None, min_length=3, max_length=30)
    intent: str = Field(default="WAKE_UP", min_length=2, max_length=60)


class ChallengeCompletionInput(BaseModel):
    answer: str | int | float = Field(max_length=255)
    # Kept as compatibility aliases. Timing is calculated from the server-side deadline.
    elapsed_seconds: float | None = Field(default=None, ge=0, le=3600)
    time_taken_seconds: float | None = Field(default=None, ge=0, le=3600)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


VALID_DIFFICULTIES = {"EASY", "MEDIUM", "HARD"}
DIFFICULTY_LEVELS = ("EASY", "MEDIUM", "HARD")
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


def issue_token(user: User):
    return jwt.encode(
        {"sub": str(user.id), "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)},
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(db_session)):
    try:
        user_id = int(jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM]).get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
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
    if normalized not in VALID_DIFFICULTIES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="difficulty must be EASY, MEDIUM, or HARD")
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
    return {"EASY": 90, "MEDIUM": 75, "HARD": 60}[difficulty]


def challenge_max_attempts(difficulty: str) -> int:
    """Keep early confidence-building challenges forgiving without making hard ones trivial."""

    return {"EASY": 3, "MEDIUM": 2, "HARD": 2}[difficulty]


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
    baseline = normalize_difficulty(requested, profile.difficulty_preference) if requested and requested != "AUTO" else normalize_difficulty(profile.difficulty_preference)
    all_recent = recent_completed_challenges(user_id, db, limit=12)
    typed_recent = recent_completed_challenges(user_id, db, challenge_type=challenge_type, limit=12)
    recent = typed_recent if len(typed_recent) >= 2 else all_recent
    if not recent:
        return baseline, f"Starting at your {baseline.lower()} preference until your route has performance history."

    metrics = challenge_metrics(recent)
    base_level = DIFFICULTY_LEVELS.index(baseline)
    if metrics["highest_solved_level"] is not None:
        base_level = max(base_level, metrics["highest_solved_level"])

    is_fast = metrics["median_speed_ratio"] is not None and metrics["median_speed_ratio"] <= 0.7
    is_strong = (
        len(recent) >= 3
        and metrics["accuracy"] >= 0.8
        and is_fast
        and metrics["average_failed_attempts"] <= 0.5
        and metrics["failure_streak"] == 0
    )
    is_struggling = (
        len(recent) >= 2
        and (
            metrics["accuracy"] < 0.5
            or (metrics["median_speed_ratio"] is not None and metrics["median_speed_ratio"] >= 0.9)
            or metrics["average_failed_attempts"] >= 1
            or metrics["failure_streak"] >= 2
        )
    )
    if is_strong:
        level = min(base_level + 1, len(DIFFICULTY_LEVELS) - 1)
        chosen = DIFFICULTY_LEVELS[level]
        return chosen, f"Recent {round(metrics['accuracy'] * 100)}% accuracy and quick finishes moved you to {chosen.lower()}."
    if is_struggling:
        level = max(base_level - 1, 0)
        chosen = DIFFICULTY_LEVELS[level]
        return chosen, f"Recent retries and timing suggest a {chosen.lower()} reset will build momentum."
    chosen = DIFFICULTY_LEVELS[base_level]
    return chosen, f"Keeping you at {chosen.lower()} while your accuracy and pace stabilize."


def challenge_public_payload(challenge: ChallengeAttempt, now: datetime | None = None, selection_reason: str | None = None) -> dict:
    current = now or datetime.now(timezone.utc)
    payload = {
        "challenge_id": challenge.challenge_id,
        "challenge_type": challenge.challenge_type,
        "difficulty": challenge.difficulty,
        "intent": challenge.intent,
        "question": challenge.prompt,
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
    level = {"EASY": 1, "MEDIUM": 2, "HARD": 3}[difficulty]

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


def latest_sleep_score(user_id: int, db: Session) -> int | None:
    return db.scalar(
        select(Analytics.sleep_score).where(Analytics.user_id == user_id).order_by(Analytics.recorded_at.desc()).limit(1)
    )


def local_now(profile: UserProfile) -> datetime:
    return datetime.now(timezone.utc).astimezone(safe_zone(profile.timezone)).replace(tzinfo=None, second=0, microsecond=0)


def next_alarm_options(user: User, db: Session, now: datetime | None = None) -> tuple[UserProfile, datetime, list[tuple[Alarm, datetime]]]:
    profile = ensure_profile(user, db)
    current_time = now or local_now(profile)
    score = latest_sleep_score(user.id, db)
    active = db.scalars(select(Alarm).where(Alarm.user_id == user.id, Alarm.status == "ACTIVE")).all()
    options = [
        (alarm, next_occurrence(alarm.alarm_time, alarm.alarm_type, alarm.repeat_days, score, current_time))
        for alarm in active
    ]
    return profile, current_time, [(alarm, occurrence) for alarm, occurrence in options if occurrence]


app = FastAPI(title="BrainOS API")
scheduler = BackgroundScheduler(timezone="UTC")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax", https_only=False)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
            due_local = next_occurrence(
                alarm.alarm_time,
                alarm.alarm_type,
                alarm.repeat_days,
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
            if alarm.alarm_type.upper() == "ONE_TIME":
                alarm.status = "COMPLETED"
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
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
            "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
        ]
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
    if not scheduler.running:
        scheduler.add_job(fire_due_alarms, "interval", minutes=1, id="alarm_dispatch", replace_existing=True)
        scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/health")
def health():
    return {"status": "neural core online"}


@app.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterInput, db: Session = Depends(db_session)):
    if db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    user = User(name=data.name.strip(), email=data.email.lower(), password=pwd_context.hash(data.password), provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(UserProfile(user_id=user.id))
    db.commit()
    return {"access_token": issue_token(user)}


@app.post("/login", response_model=TokenResponse)
def login(data: LoginInput, db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.password or not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.")
    return {"access_token": issue_token(user)}


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
    return RedirectResponse(f"{FRONTEND_URL}?token={issue_token(user)}")


@app.get("/profile")
def profile(user: User = Depends(current_user), db: Session = Depends(db_session)):
    return profile_payload(user, ensure_profile(user, db))


@app.patch("/profile")
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


@app.post("/alarm", status_code=status.HTTP_201_CREATED)
def create_alarm(data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = Alarm(
        user_id=user.id,
        alarm_time=parse_alarm_clock(data.alarm_time),
        title=data.title.strip(),
        alarm_type=data.alarm_type.upper(),
        repeat_days=data.repeat_days,
        difficulty=normalize_difficulty(data.difficulty),
        sound=data.sound,
        vibration=data.vibration,
        snooze_minutes=data.snooze_minutes,
        status=data.status.upper(),
        daybreak_route_enabled=data.daybreak_route_enabled,
        wake_window_minutes=data.wake_window_minutes,
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return alarm


@app.get("/alarms")
def alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    return db.scalars(select(Alarm).where(Alarm.user_id == user.id).order_by(Alarm.alarm_time)).all()


@app.patch("/alarm/{alarm_id}")
def update_alarm(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = owned_alarm(alarm_id, user, db)
    alarm.alarm_time = parse_alarm_clock(data.alarm_time)
    alarm.title = data.title.strip()
    alarm.alarm_type = data.alarm_type.upper()
    alarm.repeat_days = data.repeat_days
    alarm.difficulty = normalize_difficulty(data.difficulty)
    alarm.sound = data.sound
    alarm.vibration = data.vibration
    alarm.snooze_minutes = data.snooze_minutes
    alarm.status = data.status.upper()
    alarm.daybreak_route_enabled = data.daybreak_route_enabled
    alarm.wake_window_minutes = data.wake_window_minutes
    db.commit()
    db.refresh(alarm)
    return alarm


@app.delete("/alarm/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    db.delete(owned_alarm(alarm_id, user, db))
    db.commit()


@app.post("/alarms", status_code=status.HTTP_201_CREATED)
def create_alarm_rest(data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return create_alarm(data, user, db)


@app.get("/alarms/{alarm_id}")
def get_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return owned_alarm(alarm_id, user, db)


@app.put("/alarms/{alarm_id}")
def update_alarm_rest(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return update_alarm(alarm_id, data, user, db)


@app.delete("/alarms/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm_rest(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    return delete_alarm(alarm_id, user, db)


@app.patch("/alarms/{alarm_id}/{command}")
def toggle_alarm(alarm_id: int, command: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    if command not in {"enable", "disable"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Use enable or disable")
    alarm = owned_alarm(alarm_id, user, db)
    alarm.status = "ACTIVE" if command == "enable" else "DISABLED"
    db.commit()
    return {"alarm_id": alarm_id, "status": alarm.status}


@app.get("/alarms/today")
def today_alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    _, current_time, options = next_alarm_options(user, db)
    return [alarm for alarm, occurrence in options if occurrence.date() == current_time.date()]


@app.get("/alarms/upcoming")
def upcoming_alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    _, _, options = next_alarm_options(user, db)
    return [
        {"alarm": alarm, "next_at": occurrence}
        for alarm, occurrence in sorted(options, key=lambda item: item[1])
    ]


@app.post("/alarms/check-next")
def check_next_alarm(user: User = Depends(current_user), db: Session = Depends(db_session)):
    _, _, options = next_alarm_options(user, db)
    if not options:
        return {"next_alarm": None}
    alarm, moment = min(options, key=lambda item: item[1])
    return {"next_alarm": alarm, "next_at": moment}


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
def complete_mission(mission_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    mission = db.get(Mission, mission_id)
    if not mission or mission.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found")
    mission.completed = True
    db.commit()
    return {"mission_id": mission_id, "completed": True, "reward": mission.reward}


@app.post("/challenge", status_code=status.HTTP_201_CREATED, include_in_schema=False)
@app.post("/challenges/generate", status_code=status.HTTP_201_CREATED)
def generate_challenge(data: ChallengeGenerateInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    """Build a time-bound challenge without ever exposing the expected answer."""

    profile_record = ensure_profile(user, db)
    challenge_type, type_reason = choose_challenge_type(user.id, data.type or data.challenge_type, db)
    difficulty, difficulty_reason = choose_challenge_difficulty(profile_record, user.id, challenge_type, data.difficulty, db)
    intent = data.intent.strip().upper().replace("-", "_").replace(" ", "_") or "WAKE_UP"
    prompt, expected_answer, instructions = deterministic_challenge(challenge_type, difficulty, intent, secrets.token_urlsafe(12))
    created_at = datetime.now(timezone.utc)
    limit = challenge_time_limit(difficulty)
    challenge = ChallengeAttempt(
        user_id=user.id,
        challenge_type=challenge_type,
        difficulty=difficulty,
        intent=intent,
        prompt=prompt,
        expected_answer=normalize_answer(expected_answer),
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


@app.get("/analytics")
def analytics(user: User = Depends(current_user), db: Session = Depends(db_session)):
    records = list(
        db.scalars(select(Analytics).where(Analytics.user_id == user.id).order_by(Analytics.recorded_at.desc()).limit(7))
    )
    if not records:
        return {"focus_score": 74, "habit_score": 68, "sleep_score": 72, "history": [56, 63, 59, 71, 67, 82, 74]}
    latest = records[0]
    return {
        "focus_score": latest.focus_score,
        "habit_score": latest.habit_score,
        "sleep_score": latest.sleep_score,
        "history": [record.sleep_score for record in reversed(records)],
    }
