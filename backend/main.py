from typing import List, Optional, Any
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
try:
    from database import get_db, engine
    from models import User, Alarm, ChallengeLog, Achievement, Base
    from schemas import ChallengeResponse, ChallengeVerifyRequest, ChallengeVerifyResponse, AchievementItem, LearningTrendResponse
    from challenge_generator import generate_cognitive_challenge
    from auth import hash_password, verify_password, create_token
except ImportError:
    from backend.database import get_db, engine
    from backend.models import User, Alarm, ChallengeLog, Achievement, Base
    from backend.schemas import ChallengeResponse, ChallengeVerifyRequest, ChallengeVerifyResponse, AchievementItem, LearningTrendResponse
    from backend.challenge_generator import generate_cognitive_challenge
    from backend.auth import hash_password, verify_password, create_token
from authlib.integrations.starlette_client import OAuth
from urllib.parse import quote
import traceback
import os

app = FastAPI(title="Wellspring API")
Base.metadata.create_all(bind=engine)

# Ensure database tables & schema migrations
try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE challenge_logs ADD COLUMN IF NOT EXISTS alarm_id INTEGER REFERENCES alarms(id) ON DELETE SET NULL;"))
        conn.commit()
except Exception as e:
    print(f"Startup DB migration info: {e}")

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
    snooze_duration: int = 5
    max_snooze_count: int = 3

class AlarmUpdate(BaseModel):
    title: str
    alarm_time: str
    alarm_type: str = "daily"
    repeat_days: str = "Mon-Fri"
    difficulty_level: str = "medium"
    sound: str = "default"
    vibration: bool = True
    snooze_enabled: bool = True
    snooze_duration: int = 5
    max_snooze_count: int = 3
    current_snooze_count: Optional[int] = 0


def alarm_to_dict(a: Alarm) -> dict:
    return {
        "id":                   a.id,
        "user_id":              a.user_id,
        "title":                a.title,
        "alarm_time":           str(a.alarm_time),
        "alarm_type":           a.alarm_type,
        "repeat_days":          a.repeat_days,
        "is_active":            a.is_active,
        "difficulty_level":     a.difficulty_level,
        "challenge":            a.challenge,
        "sound":                a.sound,
        "vibration":            a.vibration,
        "snooze_enabled":       a.snooze_enabled,
        "snooze_duration":      getattr(a, "snooze_duration", 5),
        "max_snooze_count":     getattr(a, "max_snooze_count", 3),
        "current_snooze_count": getattr(a, "current_snooze_count", 0),
        "created_at":           str(a.created_at),
        "updated_at":           str(a.updated_at),
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
        snooze_duration=data.snooze_duration,
        max_snooze_count=data.max_snooze_count,
        current_snooze_count=0
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
    alarm.snooze_duration  = data.snooze_duration
    alarm.max_snooze_count = data.max_snooze_count
    if data.current_snooze_count is not None:
        alarm.current_snooze_count = data.current_snooze_count
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


class AlarmSnoozeUpdate(BaseModel):
    increment: bool = True
    reset: bool = False

@app.patch("/alarms/{alarm_id}/snooze")
def update_alarm_snooze(alarm_id: int, data: AlarmSnoozeUpdate, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    if data.reset:
        alarm.current_snooze_count = 0
    elif data.increment:
        alarm.current_snooze_count = getattr(alarm, "current_snooze_count", 0) + 1
    db.commit()
    db.refresh(alarm)
    return alarm_to_dict(alarm)


@app.delete("/alarms/{alarm_id}")
def delete_alarm(alarm_id: int, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    db.delete(alarm)
    db.commit()
    return {"message": f"Alarm {alarm_id} deleted"}


# ══════════════════════════════════════════════════════════════
#  COGNITIVE CHALLENGES
# ══════════════════════════════════════════════════════════════

@app.get("/challenges/types")
def get_challenge_types():
    return {
        "types": [
            {"id": "math", "name": "Math Problems", "description": "Mental arithmetic & multi-step calculations"},
            {"id": "logic", "name": "Logic Puzzles", "description": "Boolean logic, ordering & syllogisms"},
            {"id": "memory", "name": "Memory Challenges", "description": "Sequence recall & spatial/reverse digit memory"},
            {"id": "word", "name": "Word Games", "description": "Anagram scrambles & vocabulary association"},
            {"id": "pattern", "name": "Pattern Recognition", "description": "Sequence predictions & matrix logic"},
            {"id": "riddle", "name": "Riddles", "description": "Lateral thinking & cognitive brain-teasers"},
            {"id": "quiz", "name": "Quick Quizzes", "description": "General knowledge & analytical trivia"}
        ],
        "difficulties": ["beginner", "easy", "medium", "hard", "expert"]
    }


@app.get("/challenges/generate", response_model=ChallengeResponse)
def generate_challenge(type: str = "math", difficulty: str = "medium"):
    return generate_cognitive_challenge(challenge_type=type, difficulty=difficulty)


@app.post("/challenges/verify", response_model=ChallengeVerifyResponse)
def verify_challenge(data: ChallengeVerifyRequest, db: Session = Depends(get_db)):
    user_ans = data.user_answer.strip().lower()
    correct_ans = data.answer_key.strip().lower()

    # Direct match or numeric equivalence
    is_correct = False
    if user_ans == correct_ans:
        is_correct = True
    else:
        try:
            if float(user_ans) == float(correct_ans):
                is_correct = True
        except ValueError:
            pass

    score = 0
    if is_correct:
        base_score = 100
        # Time bonus: faster answer = higher score
        speed_bonus = max(0, int(50 - data.time_taken_seconds))
        score = base_score + speed_bonus
        msg = f"Correct! Excellent brain activation. Score: {score} pts."
    else:
        msg = f"Incorrect. The correct answer was: {data.answer_key}."

    target_user_id = data.user_id if (data.user_id and data.user_id > 0) else 1

    # Log to DB
    try:
        log = ChallengeLog(
            user_id=target_user_id,
            alarm_id=data.alarm_id,
            challenge_type=data.challenge_type or "math",
            difficulty=data.difficulty or "medium",
            success=is_correct,
            score=score,
            time_taken_seconds=data.time_taken_seconds
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error logging challenge: {e}")

    return ChallengeVerifyResponse(
        success=is_correct,
        message=msg,
        correct_answer=data.answer_key,
        score=score
    )


@app.get("/challenges/personalized/{user_id}", response_model=ChallengeResponse)
def get_personalized_challenge(user_id: int, type: str = "math", db: Session = Depends(get_db)):
    """Personalized Challenge Selection algorithm based on user history in DB:
    - Previous performance (accuracy %, total score)
    - Average time taken
    - Difficulty level completed
    - Frustration prevention auto-softening (2 consecutive fails -> step down difficulty)
    Adaptive Rule: High performance (>80% accuracy) -> Level Up. Low performance (<40% accuracy) -> Level Down."""
    
    logs = db.query(ChallengeLog).filter(ChallengeLog.user_id == user_id).order_by(ChallengeLog.created_at.desc()).limit(10).all()
    
    levels = ["beginner", "easy", "medium", "hard", "expert"]
    target_difficulty = "medium"
    
    if logs:
        total = len(logs)
        success_count = sum(1 for l in logs if l.success)
        accuracy = (success_count / total) * 100
        recent_difficulty = logs[0].difficulty if logs[0].difficulty in levels else "medium"
        curr_idx = levels.index(recent_difficulty)
        
        # Frustration Prevention Auto-Softening Check
        consecutive_fails = 0
        for l in logs[:2]:
            if not l.success:
                consecutive_fails += 1
        
        if consecutive_fails >= 2:
            # Auto-soften difficulty to prevent frustration & save streak
            target_difficulty = levels[max(curr_idx - 1, 0)]
        elif accuracy >= 80 and total >= 3:
            target_difficulty = levels[min(curr_idx + 1, len(levels) - 1)]
        elif accuracy <= 40 and total >= 3:
            target_difficulty = levels[max(curr_idx - 1, 0)]
        else:
            target_difficulty = recent_difficulty

    return generate_cognitive_challenge(challenge_type=type, difficulty=target_difficulty)


@app.get("/achievements/{user_id}", response_model=List[AchievementItem])
def get_user_achievements(user_id: int, db: Session = Depends(get_db)):
    """Gamified Achievements & Badges Evaluation Engine."""
    logs = db.query(ChallengeLog).filter(ChallengeLog.user_id == user_id).order_by(ChallengeLog.created_at.desc()).all()

    total_attempts = len(logs)
    successes = sum(1 for l in logs if l.success)
    total_score = sum(l.score for l in logs)
    
    # Fast solve check
    fastest_time = min([l.time_taken_seconds for l in logs if l.success], default=999.0)
    
    # 5-day streak calculation
    successful_dates = sorted(list(set(l.created_at.date() for l in logs if l.success)), reverse=True)
    streak = 0
    if successful_dates:
        from datetime import datetime
        today = datetime.now().date()
        if (today - successful_dates[0]).days <= 1:
            streak = 1
            for i in range(1, len(successful_dates)):
                if (successful_dates[i-1] - successful_dates[i]).days == 1:
                    streak += 1
                else:
                    break

    # Early bird count (wake up challenges solved before 7 AM)
    early_bird_count = sum(1 for l in logs if l.success and l.created_at and l.created_at.hour < 7)

    # Master logic solver check (logic/math accuracy)
    logic_math_logs = [l for l in logs if (l.challenge_type or "").lower() in ["logic", "math"]]
    logic_math_success = sum(1 for l in logic_math_logs if l.success)

    badges_def = [
        {
            "badge_key": "early_bird",
            "title": "Early Bird",
            "description": "Solve 3 alarm challenges before 7:00 AM",
            "icon": "🌅",
            "unlocked": early_bird_count >= 3,
            "progress_percent": min(100, int((early_bird_count / 3) * 100))
        },
        {
            "badge_key": "streak_master",
            "title": "Streak Master",
            "description": "Maintain a 5-day wake-up challenge streak",
            "icon": "🔥",
            "unlocked": streak >= 5,
            "progress_percent": min(100, int((streak / 5) * 100))
        },
        {
            "badge_key": "speed_demon",
            "title": "Speed Demon",
            "description": "Solve a cognitive challenge in under 10 seconds",
            "icon": "⚡",
            "unlocked": fastest_time <= 10.0 and total_attempts > 0,
            "progress_percent": 100 if fastest_time <= 10.0 and total_attempts > 0 else (50 if fastest_time <= 20.0 else 20)
        },
        {
            "badge_key": "logic_virtuoso",
            "title": "Logic Virtuoso",
            "description": "Solve 5 Math or Logic puzzles successfully",
            "icon": "🧩",
            "unlocked": logic_math_success >= 5,
            "progress_percent": min(100, int((logic_math_success / 5) * 100))
        },
        {
            "badge_key": "cognitive_master",
            "title": "Cognitive Master",
            "description": "Accumulate over 500 total performance points",
            "icon": "🧠",
            "unlocked": total_score >= 500,
            "progress_percent": min(100, int((total_score / 500) * 100))
        }
    ]

    result = []
    for b in badges_def:
        result.append(AchievementItem(
            badge_key=b["badge_key"],
            title=b["title"],
            description=b["description"],
            icon=b["icon"],
            unlocked=b["unlocked"],
            progress_percent=b["progress_percent"],
            unlocked_at=str(datetime.now()) if b["unlocked"] else None
        ))

    return result


@app.get("/challenges/trends/{user_id}", response_model=LearningTrendResponse)
def get_learning_trends(user_id: int, db: Session = Depends(get_db)):
    """Advanced Learning Pattern & Trend Analysis Endpoint."""
    from datetime import datetime, timedelta

    logs = db.query(ChallengeLog).filter(ChallengeLog.user_id == user_id).order_by(ChallengeLog.created_at.asc()).all()

    if not logs:
        return LearningTrendResponse(
            user_id=user_id,
            growth_rate_percent=0.0,
            speed_improvement_percent=0.0,
            category_balance={"math": 0, "memory": 0, "logic": 0, "speed": 0},
            strongest_domain="N/A",
            focus_domain="All",
            recommendation="Solve your first morning alarm challenge to build your personalized cognitive growth profile!",
            weekly_velocity=[
                {"week": "W1", "accuracy": 0, "speed_avg": 0.0},
                {"week": "W2", "accuracy": 0, "speed_avg": 0.0},
                {"week": "W3", "accuracy": 0, "speed_avg": 0.0},
                {"week": "W4", "accuracy": 0, "speed_avg": 0.0}
            ]
        )

    # Category performance breakdown with sub-type mapping
    def map_category(raw_type: str) -> str:
        t = (raw_type or "math").lower()
        if t in ["math"]:
            return "math"
        elif t in ["memory"]:
            return "memory"
        elif t in ["logic", "pattern"]:
            return "logic"
        else: # word, riddle, quiz, speed
            return "speed"

    cat_counts = {"math": 0, "memory": 0, "logic": 0, "speed": 0}
    cat_success = {"math": 0, "memory": 0, "logic": 0, "speed": 0}

    for l in logs:
        c = map_category(l.challenge_type)
        cat_counts[c] += 1
        if l.success:
            cat_success[c] += 1

    cat_balance = {}
    for k in ["math", "memory", "logic", "speed"]:
        if cat_counts[k] > 0:
            cat_balance[k] = round((cat_success[k] / cat_counts[k]) * 100)
        else:
            cat_balance[k] = 0

    # Strongest vs Focus Domain
    sorted_cats = sorted(cat_balance.items(), key=lambda x: x[1], reverse=True)
    strongest = sorted_cats[0][0].capitalize() if sorted_cats and sorted_cats[0][1] > 0 else "Math"
    focus = sorted_cats[-1][0].capitalize() if sorted_cats else "Memory"

    # Overall growth & speed trends
    total = len(logs)
    if total < 4:
        recent_acc = (sum(1 for l in logs if l.success) / total) * 100
        growth = round(recent_acc, 1)
        older_speed = sum(l.time_taken_seconds for l in logs) / total
        speed_imp = round(max(0, 30.0 - older_speed), 1)
    else:
        recent_half = logs[max(0, total // 2):]
        older_half = logs[:max(1, total // 2)]
        recent_acc = (sum(1 for l in recent_half if l.success) / max(1, len(recent_half))) * 100
        older_acc = (sum(1 for l in older_half if l.success) / max(1, len(older_half))) * 100
        growth = round(recent_acc - older_acc, 1)
        recent_speed = sum(l.time_taken_seconds for l in recent_half) / max(1, len(recent_half))
        older_speed = sum(l.time_taken_seconds for l in older_half) / max(1, len(older_half))
        speed_imp = round(max(0, older_speed - recent_speed), 1)

    rec_msg = f"Your highest cognitive sharpness is in {strongest}. Focus on {focus} challenges to maintain balanced neural agility."

    weekly_velocity = [
        {"week": "W1", "accuracy": int(growth * 0.8), "speed_avg": round(older_speed, 1)},
        {"week": "W2", "accuracy": int(growth), "speed_avg": round(older_speed, 1)},
        {"week": "W3", "accuracy": int(growth), "speed_avg": round(older_speed, 1)},
        {"week": "W4", "accuracy": int(growth), "speed_avg": round(older_speed, 1)}
    ]

    return LearningTrendResponse(
        user_id=user_id,
        growth_rate_percent=growth if growth > 0 else 0.0,
        speed_improvement_percent=speed_imp if speed_imp > 0 else 0.0,
        category_balance=cat_balance,
        strongest_domain=strongest,
        focus_domain=focus,
        recommendation=rec_msg,
        weekly_velocity=weekly_velocity
    )


@app.get("/challenges/performance/{user_id}")
def get_user_performance(user_id: int, db: Session = Depends(get_db)):
    """Returns analytics for Dashboard Challenge Performance Card, Streak & Pie Chart."""
    from datetime import datetime, timedelta

    logs = db.query(ChallengeLog).filter(ChallengeLog.user_id == user_id).order_by(ChallengeLog.created_at.desc()).all()
    
    if not logs:
        return {
            "total_attempts": 0,
            "success_rate": 0,
            "total_score": 0,
            "avg_time_seconds": 0,
            "recommended_difficulty": "medium",
            "categories": {"math": 0, "memory": 0, "logic": 0, "speed": 0},
            "recent_logs": [],
            "day_streak": 0,
            "breakdown": {"on_time": 0, "snoozed": 0, "failed": 0}
        }
    
    total = len(logs)
    successes = sum(1 for l in logs if l.success)
    accuracy = round((successes / total) * 100, 1)
    total_score = sum(l.score for l in logs)
    avg_time = round(sum(l.time_taken_seconds for l in logs) / total, 1)

    # Calculate streak (consecutive days with successful alarm challenge logs)
    successful_dates = sorted(list(set(l.created_at.date() for l in logs if l.success)), reverse=True)
    streak = 0
    if successful_dates:
        today = datetime.now().date()
        curr = successful_dates[0]
        if (today - curr).days <= 1:
            streak = 1
            for i in range(1, len(successful_dates)):
                if (successful_dates[i-1] - successful_dates[i]).days == 1:
                    streak += 1
                else:
                    break

    # Calculate Breakdown for Pie Chart
    on_time = sum(1 for l in logs if l.success and (l.time_taken_seconds or 0) <= 15)
    snoozed = sum(1 for l in logs if l.success and (l.time_taken_seconds or 0) > 15)
    failed = sum(1 for l in logs if not l.success)
    breakdown = {"on_time": on_time, "snoozed": snoozed, "failed": failed}

    # Category breakdown stats
    cat_counts = {"math": 0, "memory": 0, "logic": 0, "speed": 0}
    cat_successes = {"math": 0, "memory": 0, "logic": 0, "speed": 0}

    for l in logs:
        ctype = (l.challenge_type or "math").lower()
        if ctype in ["math", "memory", "logic"]:
            cat_key = ctype
        else:
            cat_key = "speed"
        cat_counts[cat_key] += 1
        if l.success:
            cat_successes[cat_key] += 1

    categories = {}
    for k in cat_counts:
        if cat_counts[k] > 0:
            categories[k] = round((cat_successes[k] / cat_counts[k]) * 100)
        else:
            categories[k] = 0
    
    levels = ["beginner", "easy", "medium", "hard", "expert"]
    recent_diff = logs[0].difficulty if logs[0].difficulty in levels else "medium"
    curr_idx = levels.index(recent_diff)
    
    if accuracy >= 80 and total >= 3:
        recommended = levels[min(curr_idx + 1, len(levels) - 1)]
    elif accuracy <= 40 and total >= 3:
        recommended = levels[max(curr_idx - 1, 0)]
    else:
        recommended = recent_diff

    # Dynamic Productivity Insights calculation based on user logs
    wake_hours = [l.created_at.hour + (l.created_at.minute / 60.0) for l in logs if l.created_at]
    avg_hour = (sum(wake_hours) / len(wake_hours)) if wake_hours else 7.5
    
    peak_start_m = int((avg_hour * 60 + 30) % 1440)
    peak_end_m = int((avg_hour * 60 + 120) % 1440)
    
    def fmt_m(m):
        h = (m // 60) % 24
        mins = m % 60
        period = "AM" if h < 12 else "PM"
        disp_h = h % 12 or 12
        return f"{disp_h}:{mins:02d} {period}"

    peak_start_str = fmt_m(peak_start_m)
    peak_end_str = fmt_m(peak_end_m)
    
    insights = {
        "peak_window": f"Peak: {peak_start_str} - {peak_end_str}",
        "clarity_pill": f"{int(max(8, avg_time))} SEC AVG",
        "clarity_desc": f"Your average cognitive response speed is {avg_time}s after alarm trigger.",
        "synergy_pill": f"+{int(min(40, accuracy * 0.25))}% SPEED",
        "synergy_desc": f"Maintaining a {accuracy}% success rate boosts overall daily focus and alertness."
    }

    return {
        "total_attempts": total,
        "success_rate": accuracy,
        "total_score": total_score,
        "avg_time_seconds": avg_time,
        "recommended_difficulty": recommended,
        "categories": categories,
        "day_streak": max(1, streak),
        "breakdown": breakdown,
        "insights": insights,
        "recent_logs": [
            {
                "id": l.id,
                "type": l.challenge_type,
                "difficulty": l.difficulty,
                "success": l.success,
                "score": l.score,
                "time_taken": l.time_taken_seconds,
                "timestamp": str(l.created_at)
            } for l in logs[:5]
        ]
    }


@app.get("/challenges/history")
def get_challenge_history(user_id: int = None, db: Session = Depends(get_db)):
    query = db.query(ChallengeLog)
    if user_id and user_id > 0:
        query = query.filter((ChallengeLog.user_id == user_id) | (ChallengeLog.user_id.is_(None) if user_id == 1 else False))
    
    logs = query.order_by(ChallengeLog.created_at.desc()).limit(30).all()
    
    result = []
    for l in logs:
        alarm_label = "Cognitive Alarm"
        set_time_str = "07:00 AM"
        if l.alarm_id:
            alarm = db.query(Alarm).filter(Alarm.id == l.alarm_id).first()
            if alarm:
                alarm_label = alarm.title or "Morning Alarm"
                if alarm.alarm_time:
                    set_time_str = alarm.alarm_time.strftime("%I:%M %p")

        created_dt = l.created_at or datetime.now()
        date_str = created_dt.strftime("%d %b %Y")
        dismiss_time_str = created_dt.strftime("%I:%M:%S %p")
        delay_val = round(l.time_taken_seconds, 1) if l.time_taken_seconds else 0.0
        delay_str = f"{delay_val}s"
        
        ctype = (l.challenge_type or "Math").title()
        cdiff = (l.difficulty or "Medium").title()

        result.append({
            "id": l.id,
            "date": date_str,
            "set_time": set_time_str,
            "label": alarm_label,
            "alarm_type": ctype,
            "dismiss_time": dismiss_time_str,
            "delay": delay_str,
            "puzzle_solved": f"{ctype} · {cdiff}",
            "success": l.success,
            "status": "Solved" if l.success else "Failed",
            "score": l.score,
            "timestamp": str(l.created_at)
        })
    return result


# ── Health check ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Wellspring API is running"}

