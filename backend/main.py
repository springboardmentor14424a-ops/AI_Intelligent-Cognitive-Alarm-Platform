import os
from datetime import datetime, time, timedelta, timezone
from enum import Enum

from authlib.integrations.starlette_client import OAuth
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Time, create_engine, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.requests import Request
from starlette.middleware.sessions import SessionMiddleware
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
oauth.register("google", client_id=os.getenv("GOOGLE_CLIENT_ID"), client_secret=os.getenv("GOOGLE_CLIENT_SECRET"), server_metadata_url="https://accounts.google.com/.well-known/openid-configuration", client_kwargs={"scope": "openid email profile"})

class Base(DeclarativeBase): pass
class Role(str, Enum): USER = "USER"; ADMIN = "ADMIN"; WELLNESS_COACH = "WELLNESS_COACH"
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(30), default=Role.USER.value)
    provider: Mapped[str] = mapped_column(String(30), default="LOCAL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
class Mission(Base):
    __tablename__ = "missions"
    mission_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    challenge_type: Mapped[str] = mapped_column(String(40))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    reward: Mapped[int] = mapped_column(Integer, default=180)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
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

class RegisterInput(BaseModel): name: str = Field(min_length=2, max_length=120); email: EmailStr; password: str = Field(min_length=8, max_length=128)
class LoginInput(BaseModel): email: EmailStr; password: str
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
class MissionInput(BaseModel): challenge_type: str = Field(min_length=2, max_length=40); reward: int = Field(default=180, ge=0, le=500)
class SleepInput(BaseModel): sleep_time: datetime; wake_time: datetime; quality: float = Field(ge=0, le=100)
class ProfileUpdate(BaseModel): name: str = Field(min_length=2, max_length=120)
class TokenResponse(BaseModel): access_token: str; token_type: str = "bearer"

def db_session():
    db = SessionLocal()
    try: yield db
    finally: db.close()
def issue_token(user: User): return jwt.encode({"sub": str(user.id), "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)}, JWT_SECRET, algorithm=ALGORITHM)
def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(db_session)):
    try: user_id = int(jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM]).get("sub"))
    except (JWTError, TypeError, ValueError): raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = db.get(User, user_id)
    if not user: raise HTTPException(status_code=401, detail="User not found")
    return user
def owned_alarm(alarm_id: int, user: User, db: Session):
    alarm = db.get(Alarm, alarm_id)
    if not alarm or alarm.user_id != user.id: raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm

app = FastAPI(title="BrainOS API")
scheduler = BackgroundScheduler(timezone="UTC")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax", https_only=False)
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_URL], allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$", allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
def fire_due_alarms():
    """Background scheduler hook; replace print with Firebase/local push in production."""
    now = datetime.now().time().replace(second=0, microsecond=0)
    with SessionLocal() as db:
        due = db.scalars(select(Alarm).where(Alarm.status == "ACTIVE", Alarm.alarm_time == now)).all()
        for alarm in due: print(f"BrainOS alarm fired: user={alarm.user_id}, alarm={alarm.alarm_id}, title={alarm.title}")
@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        for statement in ["ALTER TABLE alarms ADD COLUMN IF NOT EXISTS title VARCHAR(120) DEFAULT 'Wake mission'", "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS alarm_type VARCHAR(30) DEFAULT 'DAILY'", "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS sound VARCHAR(80) DEFAULT 'Neural Dawn'", "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS vibration BOOLEAN DEFAULT TRUE", "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS snooze_minutes INTEGER DEFAULT 5", "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP", "ALTER TABLE alarms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"]: connection.execute(text(statement))
    if not scheduler.running: scheduler.add_job(fire_due_alarms, "interval", minutes=1, id="alarm_dispatch", replace_existing=True); scheduler.start()
@app.on_event("shutdown")
def stop_scheduler():
    if scheduler.running: scheduler.shutdown(wait=False)
@app.get("/health")
def health(): return {"status": "neural core online"}
@app.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterInput, db: Session = Depends(db_session)):
    if db.scalar(select(User).where(User.email == data.email.lower())): raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=data.name.strip(), email=data.email.lower(), password=pwd_context.hash(data.password), provider="LOCAL")
    db.add(user); db.commit(); db.refresh(user); return {"access_token": issue_token(user)}
@app.post("/login", response_model=TokenResponse)
def login(data: LoginInput, db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.password or not pwd_context.verify(data.password, user.password): raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return {"access_token": issue_token(user)}
@app.get("/oauth/google")
async def google_login(request: Request):
    if not os.getenv("GOOGLE_CLIENT_ID"): raise HTTPException(status_code=503, detail="Google OAuth has not been configured.")
    return await oauth.google.authorize_redirect(request, request.url_for("google_callback"))
@app.get("/oauth/google/callback")
async def google_callback(request: Request, db: Session = Depends(db_session)):
    token = await oauth.google.authorize_access_token(request); info = token.get("userinfo") or await oauth.google.userinfo(token=token)
    email = info["email"].lower(); user = db.scalar(select(User).where(User.email == email))
    if not user: user = User(name=info.get("name", email.split("@")[0]), email=email, provider="GOOGLE"); db.add(user); db.commit(); db.refresh(user)
    return RedirectResponse(f"{FRONTEND_URL}?token={issue_token(user)}")
@app.get("/profile")
def profile(user: User = Depends(current_user)): return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "provider": user.provider}
@app.patch("/profile")
def update_profile(data: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(db_session)):
    user.name = data.name.strip(); db.commit(); return {"name": user.name}
@app.post("/alarm", status_code=status.HTTP_201_CREATED)
def create_alarm(data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    try: alarm_time = datetime.strptime(data.alarm_time, "%H:%M").time()
    except ValueError: raise HTTPException(status_code=422, detail="alarm_time must be HH:MM")
    alarm = Alarm(user_id=user.id, alarm_time=alarm_time, title=data.title.strip(), alarm_type=data.alarm_type.upper(), repeat_days=data.repeat_days, difficulty=data.difficulty.upper(), sound=data.sound, vibration=data.vibration, snooze_minutes=data.snooze_minutes, status=data.status.upper()); db.add(alarm); db.commit(); db.refresh(alarm); return alarm
@app.get("/alarms")
def alarms(user: User = Depends(current_user), db: Session = Depends(db_session)): return db.scalars(select(Alarm).where(Alarm.user_id == user.id).order_by(Alarm.alarm_time)).all()
@app.patch("/alarm/{alarm_id}")
def update_alarm(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = owned_alarm(alarm_id, user, db); alarm.alarm_time = datetime.strptime(data.alarm_time, "%H:%M").time(); alarm.title = data.title.strip(); alarm.alarm_type = data.alarm_type.upper(); alarm.repeat_days = data.repeat_days; alarm.difficulty = data.difficulty.upper(); alarm.sound = data.sound; alarm.vibration = data.vibration; alarm.snooze_minutes = data.snooze_minutes; alarm.status = data.status.upper(); db.commit(); db.refresh(alarm); return alarm
@app.delete("/alarm/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    db.delete(owned_alarm(alarm_id, user, db)); db.commit()
@app.post("/alarms", status_code=status.HTTP_201_CREATED)
def create_alarm_rest(data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)): return create_alarm(data, user, db)
@app.get("/alarms/{alarm_id}")
def get_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)): return owned_alarm(alarm_id, user, db)
@app.put("/alarms/{alarm_id}")
def update_alarm_rest(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)): return update_alarm(alarm_id, data, user, db)
@app.delete("/alarms/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm_rest(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)): return delete_alarm(alarm_id, user, db)
@app.patch("/alarms/{alarm_id}/{command}")
def toggle_alarm(alarm_id: int, command: str, user: User = Depends(current_user), db: Session = Depends(db_session)):
    if command not in {"enable", "disable"}: raise HTTPException(status_code=404, detail="Use enable or disable")
    alarm = owned_alarm(alarm_id, user, db); alarm.status = "ACTIVE" if command == "enable" else "DISABLED"; db.commit(); return {"alarm_id": alarm_id, "status": alarm.status}
@app.get("/alarms/today")
def today_alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    return [alarm for alarm in db.scalars(select(Alarm).where(Alarm.user_id == user.id, Alarm.status == "ACTIVE")).all() if next_occurrence(alarm.alarm_time, alarm.alarm_type, alarm.repeat_days) and next_occurrence(alarm.alarm_time, alarm.alarm_type, alarm.repeat_days).date() == datetime.now().date()]
@app.get("/alarms/upcoming")
def upcoming_alarms(user: User = Depends(current_user), db: Session = Depends(db_session)):
    active = db.scalars(select(Alarm).where(Alarm.user_id == user.id, Alarm.status == "ACTIVE")).all()
    return sorted([{"alarm": alarm, "next_at": next_occurrence(alarm.alarm_time, alarm.alarm_type, alarm.repeat_days)} for alarm in active], key=lambda item: item["next_at"] or datetime.max)
@app.post("/alarms/check-next")
def check_next_alarm(user: User = Depends(current_user), db: Session = Depends(db_session)):
    active = db.scalars(select(Alarm).where(Alarm.user_id == user.id, Alarm.status == "ACTIVE")).all()
    options = [(alarm, next_occurrence(alarm.alarm_time, alarm.alarm_type, alarm.repeat_days)) for alarm in active]
    options = [(alarm, moment) for alarm, moment in options if moment]
    if not options: return {"next_alarm": None}
    alarm, moment = min(options, key=lambda item: item[1]); return {"next_alarm": alarm, "next_at": moment}
@app.post("/mission", status_code=status.HTTP_201_CREATED)
def create_mission(data: MissionInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    mission = Mission(user_id=user.id, challenge_type=data.challenge_type.upper(), reward=data.reward); db.add(mission); db.commit(); db.refresh(mission); return mission
@app.get("/missions")
def missions(user: User = Depends(current_user), db: Session = Depends(db_session)): return db.scalars(select(Mission).where(Mission.user_id == user.id).order_by(Mission.created_at.desc())).all()
@app.patch("/mission/{mission_id}/complete")
def complete_mission(mission_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    mission = db.get(Mission, mission_id)
    if not mission or mission.user_id != user.id: raise HTTPException(status_code=404, detail="Mission not found")
    mission.completed = True; db.commit(); return {"mission_id": mission_id, "completed": True, "reward": mission.reward}
@app.post("/sleep", status_code=status.HTTP_201_CREATED)
def log_sleep(data: SleepInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    if data.wake_time <= data.sleep_time: raise HTTPException(status_code=422, detail="wake_time must be after sleep_time")
    record = SleepLog(user_id=user.id, **data.model_dump()); db.add(record); db.commit(); db.refresh(record); return record
@app.get("/analytics")
def analytics(user: User = Depends(current_user), db: Session = Depends(db_session)):
    records = list(db.scalars(select(Analytics).where(Analytics.user_id == user.id).order_by(Analytics.recorded_at.desc()).limit(7)))
    if not records: return {"focus_score": 74, "habit_score": 68, "sleep_score": 72, "history": [56, 63, 59, 71, 67, 82, 74]}
    latest = records[0]; return {"focus_score": latest.focus_score, "habit_score": latest.habit_score, "sleep_score": latest.sleep_score, "history": [record.sleep_score for record in reversed(records)]}
