"""Authentication and role-based access module for the alarm platform.

The implementation uses only Python's standard library for persistence and
cryptography primitives, plus FastAPI for the HTTP API.  This keeps the first
module immediately runnable while retaining production-safe password hashing
(PBKDF2-HMAC) and signed JWT access tokens.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import random
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Annotated, Callable

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BASE_DIR / "data" / "alarm.db"))
SECRET_KEY = os.getenv("JWT_SECRET", "development-only-change-this-secret")
TOKEN_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"


class Role(str, Enum):
    USER = "user"
    WELLNESS_COACH = "wellness_coach"
    ADMINISTRATOR = "administrator"


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    timezone: str = Field(default="Asia/Kolkata", max_length=64)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    timezone: str | None = Field(default=None, max_length=64)
    preferred_wake_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    sleep_duration_hours: float | None = Field(default=None, ge=1, le=16)
    difficulty_preference: str | None = Field(default=None, max_length=20)


class RoleUpdate(BaseModel):
    role: Role


class AdminCreateUser(RegisterRequest):
    role: Role


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: Role
    timezone: str
    preferred_wake_time: str | None
    sleep_duration_hours: float | None
    difficulty_preference: str | None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class HabitProfileUpdate(BaseModel):
    bedtime: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    wake_up_goal: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    productivity_goal: str | None = Field(default=None, max_length=240)
    habit_preferences: str | None = Field(default=None, max_length=500)


class AlarmCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    alarm_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    alarm_type: str = Field(default="daily", pattern=r"^(daily|weekday|weekend|one_time|smart_adaptive)$")
    days_of_week: str = Field(default="", max_length=40)
    enabled: bool = True


class AlarmResponse(AlarmCreate):
    id: int
    dismissed_at: datetime | None = None
    created_at: datetime


class ChallengeRequest(BaseModel):
    challenge_type: str = Field(default="math", pattern=r"^(math|logic|riddle)$")
    difficulty: str | None = Field(default=None, pattern=r"^(beginner|easy|medium|hard|expert)$")


class ChallengeResponse(BaseModel):
    id: int
    challenge_type: str
    difficulty: str
    prompt: str
    choices: list[str] | None = None


class ChallengeAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=120)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@contextmanager
def db_connection():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DATABASE_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_database() -> None:
    with db_connection() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT NOT NULL,
                timezone TEXT NOT NULL, preferred_wake_time TEXT,
                sleep_duration_hours REAL, difficulty_preference TEXT,
                created_at TEXT NOT NULL
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS habit_profiles (
                user_id INTEGER PRIMARY KEY, bedtime TEXT, wake_up_goal TEXT,
                productivity_goal TEXT, habit_preferences TEXT,
                updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS alarms (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
                title TEXT NOT NULL, alarm_time TEXT NOT NULL, alarm_type TEXT NOT NULL,
                days_of_week TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1,
                dismissed_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS challenge_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
                challenge_type TEXT NOT NULL, difficulty TEXT NOT NULL, prompt TEXT NOT NULL,
                expected_answer TEXT NOT NULL, submitted_answer TEXT, correct INTEGER,
                created_at TEXT NOT NULL, completed_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    rounds = 310_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, rounds)
    return f"pbkdf2_sha256${rounds}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, rounds, salt, expected = stored.split("$")
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_access_token(user: sqlite3.Row) -> str:
    now = _utcnow()
    payload = {"sub": str(user["id"]), "role": user["role"], "iat": int(now.timestamp()),
               "exp": int((now + timedelta(minutes=TOKEN_MINUTES)).timestamp())}
    header = {"alg": ALGORITHM, "typ": "JWT"}
    unsigned = f"{_b64(json.dumps(header, separators=(',', ':')).encode())}.{_b64(json.dumps(payload, separators=(',', ':')).encode())}"
    signature = hmac.new(SECRET_KEY.encode(), unsigned.encode(), hashlib.sha256).digest()
    return f"{unsigned}.{_b64(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        header, payload, signature = token.split(".")
        unsigned = f"{header}.{payload}"
        expected = hmac.new(SECRET_KEY.encode(), unsigned.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(signature)):
            raise ValueError("Invalid signature")
        claims = json.loads(_unb64(payload))
        if int(claims["exp"]) < int(_utcnow().timestamp()):
            raise ValueError("Expired token")
        return claims
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token",
                            headers={"WWW-Authenticate": "Bearer"})


def row_to_user(row: sqlite3.Row) -> UserResponse:
    data = dict(row)
    data.pop("password_hash", None)
    data["created_at"] = datetime.fromisoformat(data["created_at"])
    return UserResponse(**data)


async def current_user(request: Request) -> sqlite3.Row:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required", headers={"WWW-Authenticate": "Bearer"})
    claims = decode_access_token(authorization.removeprefix("Bearer "))
    with db_connection() as con:
        user = con.execute("SELECT * FROM users WHERE id = ?", (claims["sub"],)).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user


def require_roles(*roles: Role) -> Callable:
    async def role_guard(user: Annotated[sqlite3.Row, Depends(current_user)]) -> sqlite3.Row:
        if user["role"] not in {role.value for role in roles}:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return user
    return role_guard


app = FastAPI(title="Intelligent Cognitive Alarm Platform", version="0.1.0")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.on_event("startup")
def startup() -> None:
    init_database()


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    with db_connection() as con:
        try:
            con.execute("INSERT INTO users (email, password_hash, full_name, role, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        (payload.email.lower(), hash_password(payload.password), payload.full_name, Role.USER.value,
                         payload.timezone, _utcnow().isoformat()))
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        row = con.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    return row_to_user(row)


@app.post("/auth/token", response_model=TokenResponse, summary="OAuth2-compatible password login")
async def login(request: Request):
    """Accepts standard OAuth2 form fields: username and password."""
    body = (await request.body()).decode()
    from urllib.parse import parse_qs
    values = parse_qs(body)
    username, password = values.get("username", [""])[0].lower(), values.get("password", [""])[0]
    with db_connection() as con:
        user = con.execute("SELECT * FROM users WHERE email = ?", (username,)).fetchone()
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return TokenResponse(access_token=create_access_token(user), expires_in=TOKEN_MINUTES * 60)


@app.get("/auth/me", response_model=UserResponse)
def get_me(user: Annotated[sqlite3.Row, Depends(current_user)]):
    return row_to_user(user)


@app.patch("/auth/me", response_model=UserResponse)
def update_me(payload: ProfileUpdate, user: Annotated[sqlite3.Row, Depends(current_user)]):
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        return row_to_user(user)
    assignments = ", ".join(f"{field} = ?" for field in changes)
    with db_connection() as con:
        con.execute(f"UPDATE users SET {assignments} WHERE id = ?", (*changes.values(), user["id"]))
        updated = con.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return row_to_user(updated)


@app.delete("/auth/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(user: Annotated[sqlite3.Row, Depends(current_user)]):
    """Permanently delete the account belonging to the authenticated user."""
    with db_connection() as con:
        con.execute("DELETE FROM users WHERE id = ?", (user["id"],))


def alarm_response(row: sqlite3.Row) -> AlarmResponse:
    data = dict(row)
    data["enabled"] = bool(data["enabled"])
    data["dismissed_at"] = datetime.fromisoformat(data["dismissed_at"]) if data["dismissed_at"] else None
    data["created_at"] = datetime.fromisoformat(data["created_at"])
    return AlarmResponse(**data)


@app.get("/habits/me")
def get_habit_profile(user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        row = con.execute("SELECT bedtime, wake_up_goal, productivity_goal, habit_preferences, updated_at FROM habit_profiles WHERE user_id = ?", (user["id"],)).fetchone()
    return dict(row) if row else {"bedtime": None, "wake_up_goal": None, "productivity_goal": None, "habit_preferences": None, "updated_at": None}


@app.put("/habits/me")
def update_habit_profile(payload: HabitProfileUpdate, user: Annotated[sqlite3.Row, Depends(current_user)]):
    values = payload.model_dump()
    values["updated_at"] = _utcnow().isoformat()
    with db_connection() as con:
        con.execute("""INSERT INTO habit_profiles (user_id, bedtime, wake_up_goal, productivity_goal, habit_preferences, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?)
                       ON CONFLICT(user_id) DO UPDATE SET bedtime=excluded.bedtime, wake_up_goal=excluded.wake_up_goal,
                       productivity_goal=excluded.productivity_goal, habit_preferences=excluded.habit_preferences, updated_at=excluded.updated_at""",
                    (user["id"], values["bedtime"], values["wake_up_goal"], values["productivity_goal"], values["habit_preferences"], values["updated_at"]))
    return {**values}


@app.get("/alarms", response_model=list[AlarmResponse])
def list_alarms(user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        rows = con.execute("SELECT * FROM alarms WHERE user_id = ? ORDER BY alarm_time", (user["id"],)).fetchall()
    return [alarm_response(row) for row in rows]


@app.post("/alarms", response_model=AlarmResponse, status_code=status.HTTP_201_CREATED)
def create_alarm(payload: AlarmCreate, user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        cursor = con.execute("INSERT INTO alarms (user_id, title, alarm_time, alarm_type, days_of_week, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                             (user["id"], payload.title, payload.alarm_time, payload.alarm_type, payload.days_of_week, int(payload.enabled), _utcnow().isoformat()))
        row = con.execute("SELECT * FROM alarms WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return alarm_response(row)


@app.patch("/alarms/{alarm_id}/dismiss", response_model=AlarmResponse)
def dismiss_alarm(alarm_id: int, user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        con.execute("UPDATE alarms SET dismissed_at = ? WHERE id = ? AND user_id = ?", (_utcnow().isoformat(), alarm_id, user["id"]))
        row = con.execute("SELECT * FROM alarms WHERE id = ? AND user_id = ?", (alarm_id, user["id"])).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm_response(row)


@app.delete("/alarms/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(alarm_id: int, user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        deleted = con.execute("DELETE FROM alarms WHERE id = ? AND user_id = ?", (alarm_id, user["id"])).rowcount
    if not deleted:
        raise HTTPException(status_code=404, detail="Alarm not found")


def calculated_difficulty(user_id: int) -> str:
    with db_connection() as con:
        rows = con.execute("SELECT correct FROM challenge_attempts WHERE user_id = ? AND correct IS NOT NULL ORDER BY id DESC LIMIT 10", (user_id,)).fetchall()
    if len(rows) < 3:
        return "easy"
    accuracy = sum(row["correct"] for row in rows) / len(rows)
    return "expert" if accuracy >= .95 else "hard" if accuracy >= .8 else "medium" if accuracy >= .6 else "easy" if accuracy >= .4 else "beginner"


def build_challenge(challenge_type: str, difficulty: str) -> tuple[str, str]:
    level = {"beginner": 5, "easy": 10, "medium": 25, "hard": 50, "expert": 100}[difficulty]
    if challenge_type == "math":
        left, right = random.randint(1, level), random.randint(1, level)
        operator = random.choice(["+", "-"] if difficulty in {"beginner", "easy"} else ["+", "-", "*"])
        answer = left + right if operator == "+" else left - right if operator == "-" else left * right
        return f"Solve: {left} {operator} {right}", str(answer)
    if challenge_type == "logic":
        prompts = [("What comes next: 2, 4, 8, 16, ?", "32"), ("If all alarms are reminders and this is an alarm, is it a reminder? (yes/no)", "yes")]
    else:
        prompts = [("I get wetter the more I dry. What am I?", "towel"), ("What has keys but cannot open locks?", "piano")]
    return random.choice(prompts)


@app.post("/challenges/generate", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
def generate_challenge(payload: ChallengeRequest, user: Annotated[sqlite3.Row, Depends(current_user)]):
    difficulty = payload.difficulty or calculated_difficulty(user["id"])
    prompt, expected = build_challenge(payload.challenge_type, difficulty)
    with db_connection() as con:
        cursor = con.execute("INSERT INTO challenge_attempts (user_id, challenge_type, difficulty, prompt, expected_answer, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                             (user["id"], payload.challenge_type, difficulty, prompt, expected.strip().lower(), _utcnow().isoformat()))
    return ChallengeResponse(id=cursor.lastrowid, challenge_type=payload.challenge_type, difficulty=difficulty, prompt=prompt)


@app.post("/challenges/{challenge_id}/submit")
def submit_challenge(challenge_id: int, payload: ChallengeAnswer, user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        row = con.execute("SELECT expected_answer, difficulty, correct FROM challenge_attempts WHERE id = ? AND user_id = ?", (challenge_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")
        if row["correct"] is not None:
            raise HTTPException(status_code=400, detail="Challenge was already submitted")
        correct = payload.answer.strip().lower() == row["expected_answer"].strip().lower()
        con.execute("UPDATE challenge_attempts SET submitted_answer = ?, correct = ?, completed_at = ? WHERE id = ?",
                    (payload.answer, int(correct), _utcnow().isoformat(), challenge_id))
    return {"correct": correct, "next_difficulty": calculated_difficulty(user["id"])}


@app.get("/adaptive/difficulty")
def adaptive_difficulty(user: Annotated[sqlite3.Row, Depends(current_user)]):
    with db_connection() as con:
        rows = con.execute("SELECT correct FROM challenge_attempts WHERE user_id = ? AND correct IS NOT NULL ORDER BY id DESC LIMIT 10", (user["id"],)).fetchall()
    accuracy = round(100 * sum(row["correct"] for row in rows) / len(rows)) if rows else None
    return {"recommended_difficulty": calculated_difficulty(user["id"]), "recent_attempts": len(rows), "recent_accuracy_percent": accuracy}


@app.get("/coach/users", response_model=list[UserResponse])
def coach_users(_: Annotated[sqlite3.Row, Depends(require_roles(Role.WELLNESS_COACH, Role.ADMINISTRATOR))]):
    with db_connection() as con:
        rows = con.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    return [row_to_user(row) for row in rows]


@app.patch("/admin/users/{user_id}/role", response_model=UserResponse)
def set_role(user_id: int, payload: RoleUpdate,
             admin: Annotated[sqlite3.Row, Depends(require_roles(Role.ADMINISTRATOR))]):
    if user_id == admin["id"] and payload.role != Role.ADMINISTRATOR:
        raise HTTPException(status_code=400, detail="Administrators cannot remove their own administrator role")
    with db_connection() as con:
        con.execute("UPDATE users SET role = ? WHERE id = ?", (payload.role.value, user_id))
        updated = con.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return row_to_user(updated)


@app.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(payload: AdminCreateUser,
                      _: Annotated[sqlite3.Row, Depends(require_roles(Role.ADMINISTRATOR))]):
    """Create a User or Wellness Coach account as an administrator."""
    if payload.role == Role.ADMINISTRATOR:
        raise HTTPException(status_code=400, detail="Administrator accounts require a controlled bootstrap process")
    with db_connection() as con:
        try:
            con.execute("INSERT INTO users (email, password_hash, full_name, role, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        (payload.email.lower(), hash_password(payload.password), payload.full_name, payload.role.value,
                         payload.timezone, _utcnow().isoformat()))
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        row = con.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    return row_to_user(row)


@app.get("/admin/overview")
def admin_overview(_: Annotated[sqlite3.Row, Depends(require_roles(Role.ADMINISTRATOR))]):
    with db_connection() as con:
        counts = con.execute("SELECT role, COUNT(*) AS count FROM users GROUP BY role").fetchall()
    return {"users_by_role": {row["role"]: row["count"] for row in counts}}
