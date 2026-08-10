from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, Alarm
from auth import hash_password, verify_password, create_token
from authlib.integrations.starlette_client import OAuth
from urllib.parse import quote
import traceback
import os

app = FastAPI(title="Wellspring API")

# ── Middleware ───────────────────────────────────────────────
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "changeme"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Google OAuth ─────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ── Global error handler ─────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("=== SERVER ERROR ===")
    print(traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# ══════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "user"

class SigninRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/auth/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        provider="local"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.role)
    return {
        "token": token,
        "user": {"id": user.id, "full_name": user.full_name,
                 "email": user.email, "role": user.role}
    }


@app.post("/auth/signin")
def signin(data: SigninRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_token(user.id, user.role)
    return {
        "token": token,
        "user": {"id": user.id, "full_name": user.full_name,
                 "email": user.email, "role": user.role}
    }


@app.get("/auth/google")
async def google_login(request: Request):
    redirect_uri = "http://localhost:8000/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")
    email     = user_info["email"]
    full_name = user_info.get("name", email)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(full_name=full_name, email=email,
                    password_hash=None, role="user", provider="google")
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_token(user.id, user.role)
    safe_name = quote(user.full_name)
    return RedirectResponse(
        url=f"http://127.0.0.1:5500/dashboard.html?token={jwt_token}&name={safe_name}&role={user.role}&id={user.id}"
    )


# ══════════════════════════════════════════════════════════════
#  ALARMS
# ══════════════════════════════════════════════════════════════

class AlarmCreate(BaseModel):
    user_id: int
    title: str = "My Alarm"
    alarm_time: str
    alarm_type: str = "daily"
    repeat_days: str = "Mon-Fri"
    difficulty_level: str = "medium"
    challenge: str = "math"
    sound: str = "default"
    vibration: bool = True
    snooze_enabled: bool = True

class AlarmUpdate(BaseModel):
    title: str
    alarm_time: str
    alarm_type: str = "daily"
    repeat_days: str = "Mon-Fri"
    difficulty_level: str = "medium"
    sound: str = "default"
    vibration: bool = True
    snooze_enabled: bool = True


def alarm_to_dict(a: Alarm) -> dict:
    return {
        "id":               a.id,
        "user_id":          a.user_id,
        "title":            a.title,
        "alarm_time":       str(a.alarm_time),
        "alarm_type":       a.alarm_type,
        "repeat_days":      a.repeat_days,
        "is_active":        a.is_active,
        "difficulty_level": a.difficulty_level,
        "challenge":        a.challenge,
        "sound":            a.sound,
        "vibration":        a.vibration,
        "snooze_enabled":   a.snooze_enabled,
        "created_at":       str(a.created_at),
        "updated_at":       str(a.updated_at),
    }


@app.post("/alarms")
def create_alarm(data: AlarmCreate, db: Session = Depends(get_db)):
    alarm = Alarm(
        user_id=data.user_id,
        title=data.title,
        alarm_time=data.alarm_time,
        alarm_type=data.alarm_type,
        repeat_days=data.repeat_days,
        difficulty_level=data.difficulty_level,
        challenge=data.challenge,
        sound=data.sound,
        vibration=data.vibration,
        snooze_enabled=data.snooze_enabled,
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return alarm_to_dict(alarm)


@app.get("/alarms/{user_id}")
def get_alarms(user_id: int, db: Session = Depends(get_db)):
    alarms = db.query(Alarm).filter(Alarm.user_id == user_id).order_by(Alarm.created_at.desc()).all()
    return [alarm_to_dict(a) for a in alarms]


@app.put("/alarms/{alarm_id}")
def update_alarm(alarm_id: int, data: AlarmUpdate, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    alarm.title            = data.title
    alarm.alarm_time       = data.alarm_time
    alarm.alarm_type       = data.alarm_type
    alarm.repeat_days      = data.repeat_days
    alarm.difficulty_level = data.difficulty_level
    alarm.sound            = data.sound
    alarm.vibration        = data.vibration
    alarm.snooze_enabled   = data.snooze_enabled
    db.commit()
    db.refresh(alarm)
    return alarm_to_dict(alarm)


@app.patch("/alarms/{alarm_id}/toggle")
def toggle_alarm(alarm_id: int, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    alarm.is_active = not alarm.is_active
    db.commit()
    return {"alarm_id": alarm.id, "is_active": alarm.is_active}


@app.delete("/alarms/{alarm_id}")
def delete_alarm(alarm_id: int, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    db.delete(alarm)
    db.commit()
    return {"message": f"Alarm {alarm_id} deleted"}


# ── Health check ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Wellspring API is running"}
