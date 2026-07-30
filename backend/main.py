import os
from datetime import datetime, time, timedelta, timezone
from enum import Enum

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Time, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.requests import Request

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/brainos")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-before-production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
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
class AlarmInput(BaseModel): alarm_time: str; repeat_days: str | None = None; difficulty: str = "MEDIUM"; status: str = "ACTIVE"
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
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_URL], allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$", allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
@app.on_event("startup")
def create_tables(): Base.metadata.create_all(engine)
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
    alarm = Alarm(user_id=user.id, alarm_time=alarm_time, repeat_days=data.repeat_days, difficulty=data.difficulty.upper(), status=data.status.upper()); db.add(alarm); db.commit(); db.refresh(alarm); return alarm
@app.get("/alarms")
def alarms(user: User = Depends(current_user), db: Session = Depends(db_session)): return db.scalars(select(Alarm).where(Alarm.user_id == user.id).order_by(Alarm.alarm_time)).all()
@app.patch("/alarm/{alarm_id}")
def update_alarm(alarm_id: int, data: AlarmInput, user: User = Depends(current_user), db: Session = Depends(db_session)):
    alarm = owned_alarm(alarm_id, user, db); alarm.alarm_time = datetime.strptime(data.alarm_time, "%H:%M").time(); alarm.repeat_days = data.repeat_days; alarm.difficulty = data.difficulty.upper(); alarm.status = data.status.upper(); db.commit(); db.refresh(alarm); return alarm
@app.delete("/alarm/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alarm(alarm_id: int, user: User = Depends(current_user), db: Session = Depends(db_session)):
    db.delete(owned_alarm(alarm_id, user, db)); db.commit()
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
