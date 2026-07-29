import os
import datetime
from fastapi import FastAPI, Depends, Request, HTTPException, status, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import Config
from database import engine, Base, SessionLocal, get_db, User, UserProfile, Alarm, Notification, ActivityLog, Report
from routes import auth as auth_routes, user as user_routes, admin as admin_routes, coach as coach_routes, alarm as alarm_routes
import auth

# Initialize upload static paths
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/images", exist_ok=True)

# Build tables
Base.metadata.create_all(bind=engine)

# Auto seed database on startup if database is empty
def initial_seed_check():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            print("Auto-seeding default records...")
            # Admin (admin123)
            admin_user = User(
                full_name="Platform Administrator", username="admin", email="admin@cognitivealarm.com",
                password_hash=auth.get_password_hash("admin123"), role="administrator", provider="local",
                email_verified=True, account_status="active"
            )
            db.add(admin_user)
            
            # Coach (coach123)
            coach_user = User(
                full_name="Sarah Jenkins (Wellness Coach)", username="coach", email="coach@cognitivealarm.com",
                password_hash=auth.get_password_hash("coach123"), role="coach", provider="local",
                email_verified=True, account_status="active"
            )
            db.add(coach_user)
            db.commit()
            db.refresh(coach_user)
            
            # Users (user123)
            user1 = User(
                full_name="Alex Rivera", username="user", email="user@cognitivealarm.com",
                password_hash=auth.get_password_hash("user123"), role="user", provider="local",
                email_verified=True, account_status="active", coach_id=coach_user.id
            )
            user2 = User(
                full_name="Emma Watson", username="emma", email="emma@cognitivealarm.com",
                password_hash=auth.get_password_hash("user123"), role="user", provider="local",
                email_verified=False, account_status="active"
            )
            db.add(user1)
            db.add(user2)
            db.commit()
            db.refresh(user1)
            db.refresh(user2)
            
            # Profiles
            db.add_all([
                UserProfile(user_id=admin_user.id),
                UserProfile(user_id=coach_user.id),
                UserProfile(user_id=user1.id, wake_up_time="06:30", streak=5, habit_score=78),
                UserProfile(user_id=user2.id, wake_up_time="05:45", streak=14, habit_score=92)
            ])
            
            # Alarms
            db.add_all([
                Alarm(user_id=user1.id, alarm_name="Morning Run", alarm_time="06:30", repeat_type="weekdays", smart_alarm=True, challenge_required="Math Puzzle"),
                Alarm(user_id=user2.id, alarm_name="Workout Call", alarm_time="05:45", repeat_type="daily", smart_alarm=True, challenge_required="Shake Phone")
            ])
            
            # Notifications
            db.add_all([
                Notification(user_id=user1.id, title="Welcome to platform", message="Your cognitive alarm profile is active! Solve morning puzzles.", type="system", read_status=True),
                Notification(user_id=user1.id, title="Coach Sarah assigned", message="Coach Sarah has been assigned to help you optimize sleep.", type="system", read_status=False),
                Notification(user_id=user2.id, title="14-Day Streak Unlocked!", message="Phenomenal morning consistency!", type="achievement", read_status=False)
            ])
            
            # Logs
            today = datetime.datetime.utcnow()
            db.add_all([
                ActivityLog(user_id=admin_user.id, action="Login", details="Admin login success", created_at=today),
                ActivityLog(user_id=user1.id, action="Register", details="Account registered", created_at=today - datetime.timedelta(days=2)),
                ActivityLog(user_id=user1.id, action="Login", details="Login success", created_at=today),
                ActivityLog(user_id=user1.id, action="Challenge Solved", details="Solved Math Puzzle", created_at=today)
            ])
            
            db.commit()
            print("Auto-seeding successfully finished.")
    finally:
        db.close()

initial_seed_check()

app = FastAPI(
    title=Config.PROJECT_NAME,
    description="Intelligent Circadian System Panel"
)

# Static and Templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Mount API Routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth APIs"])
app.include_router(user_routes.router, prefix="/api/user", tags=["User Profile APIs"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin Control APIs"])
app.include_router(coach_routes.router, prefix="/api/coach", tags=["Coach Operations APIs"])
app.include_router(alarm_routes.router, prefix="/api/alarm", tags=["Alarms APIs"])

# HTML Page Views
@app.get("/", response_class=HTMLResponse)
def get_landing(request: Request, current_user: User = Depends(auth.get_current_user)):
    return templates.TemplateResponse("landing.html", {"request": request, "user": current_user})

@app.get("/login", response_class=HTMLResponse)
def get_login(request: Request, current_user: User = Depends(auth.get_current_user)):
    if current_user:
        return RedirectResponse(url="/dashboard")
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
def get_register(request: Request, current_user: User = Depends(auth.get_current_user)):
    if current_user:
        return RedirectResponse(url="/dashboard")
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/reset-password", response_class=HTMLResponse)
def get_reset_password(request: Request, token: str = Query("")):
    return templates.TemplateResponse("profile.html", {"request": request, "token": token})

@app.get("/dashboard")
def get_dashboard_router(current_user: User = Depends(auth.get_current_user)):
    if not current_user:
        return RedirectResponse(url="/login")
    if current_user.role == 'administrator':
        return RedirectResponse(url="/dashboard/admin")
    elif current_user.role == 'coach':
        return RedirectResponse(url="/dashboard/coach")
    else:
        return RedirectResponse(url="/dashboard/user")

@app.get("/dashboard/admin", response_class=HTMLResponse)
def get_admin_dashboard(request: Request, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user or current_user.role != 'administrator':
        return RedirectResponse(url="/login")
        
    users = db.query(User).all()
    coaches = db.query(User).filter(User.role == "coach").all()
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(30).all()
    
    # Stats
    total_users = db.query(User).count()
    active_alarms = db.query(Alarm).filter(Alarm.alarm_status == True).count()
    coaches_count = len(coaches)
    
    stats = {
        "total_users": total_users,
        "active_alarms": active_alarms,
        "coaches": coaches_count
    }
    
    return templates.TemplateResponse("admin.html", {
        "request": request,
        "user": current_user,
        "users": users,
        "coaches": coaches,
        "logs": logs,
        "stats": stats
    })

@app.get("/dashboard/coach", response_class=HTMLResponse)
def get_coach_dashboard(request: Request, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user or current_user.role not in ['coach', 'administrator']:
        return RedirectResponse(url="/login")
        
    clients = db.query(User).filter(User.coach_id == current_user.id).all()
    return templates.TemplateResponse("coach.html", {
        "request": request,
        "user": current_user,
        "clients": clients
    })

@app.get("/dashboard/user", response_class=HTMLResponse)
def get_user_dashboard(request: Request, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user:
        return RedirectResponse(url="/login")
        
    alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id).all()
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    profile = current_user.profile
    
    unread_count = sum(1 for n in notifications if not n.read_status)
    return templates.TemplateResponse("user.html", {
        "request": request,
        "user": current_user,
        "profile": profile,
        "alarms": alarms,
        "notifications": notifications,
        "unread_count": unread_count
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)