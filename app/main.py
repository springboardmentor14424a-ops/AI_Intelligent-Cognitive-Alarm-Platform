"""
Intelligent Cognitive Alarm Platform
PostgreSQL + FastAPI backend
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import random
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Annotated, Callable

import psycopg2
import psycopg2.extras
from psycopg2 import IntegrityError

from dotenv import load_dotenv

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL")

SECRET_KEY = os.getenv(
    "JWT_SECRET",
    "development-only-change-this-secret"
)

TOKEN_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

ALGORITHM = "HS256"


# ============================================================
# ROLES
# ============================================================

class Role(str, Enum):
    USER = "user"
    WELLNESS_COACH = "wellness_coach"
    ADMINISTRATOR = "administrator"


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class RegisterRequest(BaseModel):
    email: str = Field(
        min_length=3,
        max_length=254,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )
    password: str = Field(
        min_length=8,
        max_length=128
    )
    full_name: str = Field(
        min_length=1,
        max_length=100
    )
    timezone: str = Field(
        default="Asia/Kolkata",
        max_length=64
    )


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )
    timezone: str | None = Field(
        default=None,
        max_length=64
    )
    preferred_wake_time: str | None = Field(
        default=None,
        pattern=r"^([01]\d|2[0-3]):[0-5]\d$"
    )
    sleep_duration_hours: float | None = Field(
        default=None,
        ge=1,
        le=16
    )
    difficulty_preference: str | None = Field(
        default=None,
        max_length=20
    )


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
    bedtime: str | None = Field(
        default=None,
        pattern=r"^([01]\d|2[0-3]):[0-5]\d$"
    )
    wake_up_goal: str | None = Field(
        default=None,
        pattern=r"^([01]\d|2[0-3]):[0-5]\d$"
    )
    productivity_goal: str | None = Field(
        default=None,
        max_length=240
    )
    habit_preferences: str | None = Field(
        default=None,
        max_length=500
    )


class AlarmCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=80
    )
    alarm_time: str = Field(
        pattern=r"^([01]\d|2[0-3]):[0-5]\d$"
    )
    alarm_type: str = Field(
        default="daily",
        pattern=r"^(daily|weekday|weekend|one_time|smart_adaptive)$"
    )
    days_of_week: str = Field(
        default="",
        max_length=40
    )
    enabled: bool = True


class AlarmResponse(AlarmCreate):
    id: int
    dismissed_at: datetime | None = None
    created_at: datetime


class ChallengeRequest(BaseModel):
    challenge_type: str = Field(
        default="math",
        pattern=r"^(math|logic|riddle)$"
    )
    difficulty: str | None = Field(
        default=None,
        pattern=r"^(beginner|easy|medium|hard|expert)$"
    )


class ChallengeResponse(BaseModel):
    id: int
    challenge_type: str
    difficulty: str
    prompt: str
    choices: list[str] | None = None


class ChallengeAnswer(BaseModel):
    answer: str = Field(
        min_length=1,
        max_length=120
    )


# ============================================================
# UTILITY
# ============================================================

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ============================================================
# DATABASE CONNECTION
# ============================================================

@contextmanager
def db_connection():
    """
    Creates a PostgreSQL database connection.

    The DATABASE_URL is read from the .env file.
    """

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not configured. "
            "Please check your .env file."
        )

    con = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor
    )

    try:
        yield con
        con.commit()

    except Exception:
        con.rollback()
        raise

    finally:
        con.close()


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_database() -> None:
    """
    Creates all required PostgreSQL tables if they do not exist.
    """

    with db_connection() as con:

        with con.cursor() as cur:

            # ------------------------------------------------
            # USERS
            # ------------------------------------------------

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    timezone TEXT NOT NULL,
                    preferred_wake_time TEXT,
                    sleep_duration_hours DOUBLE PRECISION,
                    difficulty_preference TEXT,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """
            )

            # ------------------------------------------------
            # HABIT PROFILES
            # ------------------------------------------------

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS habit_profiles (
                    user_id INTEGER PRIMARY KEY,
                    bedtime TEXT,
                    wake_up_goal TEXT,
                    productivity_goal TEXT,
                    habit_preferences TEXT,
                    updated_at TIMESTAMPTZ NOT NULL,

                    CONSTRAINT fk_habit_user
                        FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
                """
            )

            # ------------------------------------------------
            # ALARMS
            # ------------------------------------------------

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS alarms (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    alarm_time TEXT NOT NULL,
                    alarm_type TEXT NOT NULL,
                    days_of_week TEXT NOT NULL DEFAULT '',
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    dismissed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL,

                    CONSTRAINT fk_alarm_user
                        FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
                """
            )

            # ------------------------------------------------
            # CHALLENGE ATTEMPTS
            # ------------------------------------------------

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS challenge_attempts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    challenge_type TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    expected_answer TEXT NOT NULL,
                    submitted_answer TEXT,
                    correct BOOLEAN,
                    created_at TIMESTAMPTZ NOT NULL,
                    completed_at TIMESTAMPTZ,

                    CONSTRAINT fk_challenge_user
                        FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
                """
            )


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)

    rounds = 310_000

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        rounds
    )

    return (
        f"pbkdf2_sha256$"
        f"{rounds}$"
        f"{salt.hex()}$"
        f"{digest.hex()}"
    )


def verify_password(password: str, stored: str) -> bool:

    try:

        _, rounds, salt, expected = stored.split("$")

        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            bytes.fromhex(salt),
            int(rounds)
        ).hex()

        return hmac.compare_digest(
            actual,
            expected
        )

    except (ValueError, TypeError):

        return False


# ============================================================
# JWT HELPERS
# ============================================================

def _b64(data: bytes) -> str:

    return base64.urlsafe_b64encode(
        data
    ).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:

    return base64.urlsafe_b64decode(
        data + "=" * (-len(data) % 4)
    )


def create_access_token(user) -> str:

    now = _utcnow()

    payload = {
        "sub": str(user["id"]),
        "role": user["role"],
        "iat": int(now.timestamp()),
        "exp": int(
            (
                now +
                timedelta(minutes=TOKEN_MINUTES)
            ).timestamp()
        )
    }

    header = {
        "alg": ALGORITHM,
        "typ": "JWT"
    }

    unsigned = (
        f"{_b64(json.dumps(header, separators=(',', ':')).encode())}."
        f"{_b64(json.dumps(payload, separators=(',', ':')).encode())}"
    )

    signature = hmac.new(
        SECRET_KEY.encode(),
        unsigned.encode(),
        hashlib.sha256
    ).digest()

    return (
        f"{unsigned}."
        f"{_b64(signature)}"
    )


def decode_access_token(token: str) -> dict:

    try:

        header, payload, signature = token.split(".")

        unsigned = f"{header}.{payload}"

        expected = hmac.new(
            SECRET_KEY.encode(),
            unsigned.encode(),
            hashlib.sha256
        ).digest()

        if not hmac.compare_digest(
            expected,
            _unb64(signature)
        ):
            raise ValueError("Invalid signature")

        claims = json.loads(
            _unb64(payload)
        )

        if int(claims["exp"]) < int(
            _utcnow().timestamp()
        ):
            raise ValueError("Expired token")

        return claims

    except (
        ValueError,
        KeyError,
        json.JSONDecodeError
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )


# ============================================================
# RESPONSE CONVERTERS
# ============================================================

def row_to_user(row) -> UserResponse:

    data = dict(row)

    data.pop(
        "password_hash",
        None
    )

    created_at = data.get("created_at")

    if isinstance(created_at, str):
        data["created_at"] = datetime.fromisoformat(
            created_at
        )

    return UserResponse(**data)


def alarm_response(row) -> AlarmResponse:

    data = dict(row)

    data["enabled"] = bool(
        data["enabled"]
    )

    dismissed_at = data.get(
        "dismissed_at"
    )

    created_at = data.get(
        "created_at"
    )

    if isinstance(dismissed_at, str):
        data["dismissed_at"] = datetime.fromisoformat(
            dismissed_at
        )

    if isinstance(created_at, str):
        data["created_at"] = datetime.fromisoformat(
            created_at
        )

    return AlarmResponse(**data)


# ============================================================
# CURRENT USER
# ============================================================

async def current_user(request: Request):

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    if not authorization.startswith("Bearer "):

        raise HTTPException(
            status_code=401,
            detail="Bearer token required",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    token = authorization.removeprefix(
        "Bearer "
    )

    claims = decode_access_token(token)

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT *
                FROM users
                WHERE id = %s
                """,
                (claims["sub"],)
            )

            user = cur.fetchone()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Account no longer exists"
        )

    return user


# ============================================================
# ROLE GUARD
# ============================================================

def require_roles(*roles: Role) -> Callable:

    async def role_guard(
        user: Annotated[
            dict,
            Depends(current_user)
        ]
    ):

        allowed_roles = {
            role.value
            for role in roles
        }

        if user["role"] not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail="You do not have permission for this action"
            )

        return user

    return role_guard


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Intelligent Cognitive Alarm Platform",
    version="0.1.0"
)

app.mount(
    "/static",
    StaticFiles(
        directory=BASE_DIR / "static"
    ),
    name="static"
)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup():

    init_database()


# ============================================================
# HOME
# ============================================================

@app.get(
    "/",
    include_in_schema=False
)
def home():

    return FileResponse(
        BASE_DIR /
        "static" /
        "index.html"
    )


# ============================================================
# REGISTER
# ============================================================

@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(payload: RegisterRequest):

    with db_connection() as con:

        with con.cursor() as cur:

            try:

                cur.execute(
                    """
                    INSERT INTO users
                    (
                        email,
                        password_hash,
                        full_name,
                        role,
                        timezone,
                        created_at
                    )
                    VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    RETURNING *
                    """,
                    (
                        payload.email.lower(),
                        hash_password(
                            payload.password
                        ),
                        payload.full_name,
                        Role.USER.value,
                        payload.timezone,
                        _utcnow()
                    )
                )

                row = cur.fetchone()

            except IntegrityError:

                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists"
                )

    return row_to_user(row)


# ============================================================
# LOGIN
# ============================================================

@app.post(
    "/auth/token",
    response_model=TokenResponse,
    summary="OAuth2-compatible password login"
)
async def login(request: Request):

    body = (
        await request.body()
    ).decode()

    from urllib.parse import parse_qs

    values = parse_qs(body)

    username = values.get(
        "username",
        [""]
    )[0].lower()

    password = values.get(
        "password",
        [""]
    )[0]

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT *
                FROM users
                WHERE email = %s
                """,
                (username,)
            )

            user = cur.fetchone()

    if (
        not user
        or not verify_password(
            password,
            user["password_hash"]
        )
    ):

        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    return TokenResponse(
        access_token=create_access_token(user),
        expires_in=TOKEN_MINUTES * 60
    )


# ============================================================
# GET CURRENT USER
# ============================================================

@app.get(
    "/auth/me",
    response_model=UserResponse
)
def get_me(
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    return row_to_user(user)


# ============================================================
# UPDATE CURRENT USER
# ============================================================

@app.patch(
    "/auth/me",
    response_model=UserResponse
)
def update_me(
    payload: ProfileUpdate,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    changes = payload.model_dump(
        exclude_none=True
    )

    if not changes:
        return row_to_user(user)

    allowed_fields = {
        "full_name",
        "timezone",
        "preferred_wake_time",
        "sleep_duration_hours",
        "difficulty_preference"
    }

    changes = {
        key: value
        for key, value in changes.items()
        if key in allowed_fields
    }

    assignments = ", ".join(
        f"{field} = %s"
        for field in changes
    )

    values = list(
        changes.values()
    )

    values.append(
        user["id"]
    )

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                f"""
                UPDATE users
                SET {assignments}
                WHERE id = %s
                """,
                values
            )

            cur.execute(
                """
                SELECT *
                FROM users
                WHERE id = %s
                """,
                (user["id"],)
            )

            updated = cur.fetchone()

    return row_to_user(updated)


# ============================================================
# DELETE CURRENT USER
# ============================================================

@app.delete(
    "/auth/me",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_me(
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                DELETE FROM users
                WHERE id = %s
                """,
                (user["id"],)
            )


# ============================================================
# HABIT PROFILE
# ============================================================

@app.get("/habits/me")
def get_habit_profile(
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT
                    bedtime,
                    wake_up_goal,
                    productivity_goal,
                    habit_preferences,
                    updated_at
                FROM habit_profiles
                WHERE user_id = %s
                """,
                (user["id"],)
            )

            row = cur.fetchone()

    if row:

        return dict(row)

    return {
        "bedtime": None,
        "wake_up_goal": None,
        "productivity_goal": None,
        "habit_preferences": None,
        "updated_at": None
    }


# ============================================================
# UPDATE HABIT PROFILE
# ============================================================

@app.put("/habits/me")
def update_habit_profile(
    payload: HabitProfileUpdate,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    values = payload.model_dump()

    values["updated_at"] = _utcnow()

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                INSERT INTO habit_profiles
                (
                    user_id,
                    bedtime,
                    wake_up_goal,
                    productivity_goal,
                    habit_preferences,
                    updated_at
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    bedtime = EXCLUDED.bedtime,
                    wake_up_goal = EXCLUDED.wake_up_goal,
                    productivity_goal = EXCLUDED.productivity_goal,
                    habit_preferences = EXCLUDED.habit_preferences,
                    updated_at = EXCLUDED.updated_at
                """,
                (
                    user["id"],
                    values["bedtime"],
                    values["wake_up_goal"],
                    values["productivity_goal"],
                    values["habit_preferences"],
                    values["updated_at"]
                )
            )

    return values


# ============================================================
# LIST ALARMS
# ============================================================

@app.get(
    "/alarms",
    response_model=list[AlarmResponse]
)
def list_alarms(
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT *
                FROM alarms
                WHERE user_id = %s
                ORDER BY alarm_time
                """,
                (user["id"],)
            )

            rows = cur.fetchall()

    return [
        alarm_response(row)
        for row in rows
    ]


# ============================================================
# CREATE ALARM
# ============================================================

@app.post(
    "/alarms",
    response_model=AlarmResponse,
    status_code=status.HTTP_201_CREATED
)
def create_alarm(
    payload: AlarmCreate,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                INSERT INTO alarms
                (
                    user_id,
                    title,
                    alarm_time,
                    alarm_type,
                    days_of_week,
                    enabled,
                    created_at
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING *
                """,
                (
                    user["id"],
                    payload.title,
                    payload.alarm_time,
                    payload.alarm_type,
                    payload.days_of_week,
                    payload.enabled,
                    _utcnow()
                )
            )

            row = cur.fetchone()

    return alarm_response(row)


# ============================================================
# DISMISS ALARM
# ============================================================

@app.patch(
    "/alarms/{alarm_id}/dismiss",
    response_model=AlarmResponse
)
def dismiss_alarm(
    alarm_id: int,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                UPDATE alarms
                SET dismissed_at = %s
                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    _utcnow(),
                    alarm_id,
                    user["id"]
                )
            )

            cur.execute(
                """
                SELECT *
                FROM alarms
                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    alarm_id,
                    user["id"]
                )
            )

            row = cur.fetchone()

    if not row:

        raise HTTPException(
            status_code=404,
            detail="Alarm not found"
        )

    return alarm_response(row)


# ============================================================
# DELETE ALARM
# ============================================================

@app.delete(
    "/alarms/{alarm_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_alarm(
    alarm_id: int,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                DELETE FROM alarms
                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    alarm_id,
                    user["id"]
                )
            )

            deleted = cur.rowcount

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Alarm not found"
        )


# ============================================================
# CALCULATE ADAPTIVE DIFFICULTY
# ============================================================

def calculated_difficulty(
    user_id: int
) -> str:

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT correct
                FROM challenge_attempts
                WHERE user_id = %s
                  AND correct IS NOT NULL
                ORDER BY id DESC
                LIMIT 10
                """,
                (user_id,)
            )

            rows = cur.fetchall()

    if len(rows) < 3:
        return "easy"

    accuracy = (
        sum(
            1 if row["correct"] else 0
            for row in rows
        )
        / len(rows)
    )

    if accuracy >= 0.95:
        return "expert"

    if accuracy >= 0.80:
        return "hard"

    if accuracy >= 0.60:
        return "medium"

    if accuracy >= 0.40:
        return "easy"

    return "beginner"


# ============================================================
# BUILD CHALLENGE
# ============================================================

def build_challenge(
    challenge_type: str,
    difficulty: str
) -> tuple[str, str]:

    level = {
        "beginner": 5,
        "easy": 10,
        "medium": 25,
        "hard": 50,
        "expert": 100
    }[difficulty]

    if challenge_type == "math":

        left = random.randint(
            1,
            level
        )

        right = random.randint(
            1,
            level
        )

        if difficulty in {
            "beginner",
            "easy"
        }:

            operator = random.choice(
                ["+", "-"]
            )

        else:

            operator = random.choice(
                ["+", "-", "*"]
            )

        if operator == "+":

            answer = left + right

        elif operator == "-":

            answer = left - right

        else:

            answer = left * right

        return (
            f"Solve: {left} {operator} {right}",
            str(answer)
        )

    if challenge_type == "logic":

        prompts = [
            (
                "What comes next: 2, 4, 8, 16, ?",
                "32"
            ),
            (
                "If all alarms are reminders and this is an alarm, is it a reminder? (yes/no)",
                "yes"
            )
        ]

    else:

        prompts = [
            (
                "I get wetter the more I dry. What am I?",
                "towel"
            ),
            (
                "What has keys but cannot open locks?",
                "piano"
            )
        ]

    return random.choice(
        prompts
    )


# ============================================================
# GENERATE CHALLENGE
# ============================================================

@app.post(
    "/challenges/generate",
    response_model=ChallengeResponse,
    status_code=status.HTTP_201_CREATED
)
def generate_challenge(
    payload: ChallengeRequest,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    difficulty = (
        payload.difficulty
        or calculated_difficulty(
            user["id"]
        )
    )

    prompt, expected = build_challenge(
        payload.challenge_type,
        difficulty
    )

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                INSERT INTO challenge_attempts
                (
                    user_id,
                    challenge_type,
                    difficulty,
                    prompt,
                    expected_answer,
                    created_at
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                RETURNING id
                """,
                (
                    user["id"],
                    payload.challenge_type,
                    difficulty,
                    prompt,
                    expected.strip().lower(),
                    _utcnow()
                )
            )

            row = cur.fetchone()

    return ChallengeResponse(
        id=row["id"],
        challenge_type=payload.challenge_type,
        difficulty=difficulty,
        prompt=prompt
    )


# ============================================================
# SUBMIT CHALLENGE
# ============================================================

@app.post(
    "/challenges/{challenge_id}/submit"
)
def submit_challenge(
    challenge_id: int,
    payload: ChallengeAnswer,
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT
                    expected_answer,
                    difficulty,
                    correct
                FROM challenge_attempts
                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    challenge_id,
                    user["id"]
                )
            )

            row = cur.fetchone()

            if not row:

                raise HTTPException(
                    status_code=404,
                    detail="Challenge not found"
                )

            if row["correct"] is not None:

                raise HTTPException(
                    status_code=400,
                    detail="Challenge was already submitted"
                )

            correct = (
                payload.answer.strip().lower()
                ==
                row["expected_answer"].strip().lower()
            )

            cur.execute(
                """
                UPDATE challenge_attempts
                SET
                    submitted_answer = %s,
                    correct = %s,
                    completed_at = %s
                WHERE id = %s
                """,
                (
                    payload.answer,
                    correct,
                    _utcnow(),
                    challenge_id
                )
            )

    return {
        "correct": correct,
        "next_difficulty": calculated_difficulty(
            user["id"]
        )
    }


# ============================================================
# ADAPTIVE DIFFICULTY
# ============================================================

@app.get(
    "/adaptive/difficulty"
)
def adaptive_difficulty(
    user: Annotated[
        dict,
        Depends(current_user)
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT correct
                FROM challenge_attempts
                WHERE user_id = %s
                  AND correct IS NOT NULL
                ORDER BY id DESC
                LIMIT 10
                """,
                (user["id"],)
            )

            rows = cur.fetchall()

    accuracy = (
        round(
            100 *
            sum(
                1 if row["correct"] else 0
                for row in rows
            )
            /
            len(rows)
        )
        if rows
        else None
    )

    return {
        "recommended_difficulty":
            calculated_difficulty(
                user["id"]
            ),
        "recent_attempts":
            len(rows),
        "recent_accuracy_percent":
            accuracy
    }


# ============================================================
# COACH USERS
# ============================================================

@app.get(
    "/coach/users",
    response_model=list[UserResponse]
)
def coach_users(
    _: Annotated[
        dict,
        Depends(
            require_roles(
                Role.WELLNESS_COACH,
                Role.ADMINISTRATOR
            )
        )
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT *
                FROM users
                ORDER BY created_at DESC
                """
            )

            rows = cur.fetchall()

    return [
        row_to_user(row)
        for row in rows
    ]


# ============================================================
# ADMIN - CHANGE USER ROLE
# ============================================================

@app.patch(
    "/admin/users/{user_id}/role",
    response_model=UserResponse
)
def set_role(
    user_id: int,
    payload: RoleUpdate,
    admin: Annotated[
        dict,
        Depends(
            require_roles(
                Role.ADMINISTRATOR
            )
        )
    ]
):

    if (
        user_id == admin["id"]
        and payload.role != Role.ADMINISTRATOR
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Administrators cannot remove "
                "their own administrator role"
            )
        )

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                UPDATE users
                SET role = %s
                WHERE id = %s
                """,
                (
                    payload.role.value,
                    user_id
                )
            )

            cur.execute(
                """
                SELECT *
                FROM users
                WHERE id = %s
                """,
                (user_id,)
            )

            updated = cur.fetchone()

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return row_to_user(updated)


# ============================================================
# ADMIN - CREATE USER
# ============================================================

@app.post(
    "/admin/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def admin_create_user(
    payload: AdminCreateUser,
    _: Annotated[
        dict,
        Depends(
            require_roles(
                Role.ADMINISTRATOR
            )
        )
    ]
):

    if payload.role == Role.ADMINISTRATOR:

        raise HTTPException(
            status_code=400,
            detail=(
                "Administrator accounts require "
                "a controlled bootstrap process"
            )
        )

    with db_connection() as con:

        with con.cursor() as cur:

            try:

                cur.execute(
                    """
                    INSERT INTO users
                    (
                        email,
                        password_hash,
                        full_name,
                        role,
                        timezone,
                        created_at
                    )
                    VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    RETURNING *
                    """,
                    (
                        payload.email.lower(),
                        hash_password(
                            payload.password
                        ),
                        payload.full_name,
                        payload.role.value,
                        payload.timezone,
                        _utcnow()
                    )
                )

                row = cur.fetchone()

            except IntegrityError:

                raise HTTPException(
                    status_code=409,
                    detail=(
                        "An account with this "
                        "email already exists"
                    )
                )

    return row_to_user(row)


# ============================================================
# ADMIN OVERVIEW
# ============================================================

@app.get(
    "/admin/overview"
)
def admin_overview(
    _: Annotated[
        dict,
        Depends(
            require_roles(
                Role.ADMINISTRATOR
            )
        )
    ]
):

    with db_connection() as con:

        with con.cursor() as cur:

            cur.execute(
                """
                SELECT
                    role,
                    COUNT(*) AS count
                FROM users
                GROUP BY role
                """
            )

            counts = cur.fetchall()

    return {
        "users_by_role": {
            row["role"]: row["count"]
            for row in counts
        }
    }