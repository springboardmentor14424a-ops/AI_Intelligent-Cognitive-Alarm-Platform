import os
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, HTTPException, status, Query
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import Config
from database import engine, Base, SessionLocal, get_db, User, UserProfile, Alarm, Notification, ActivityLog, Report
from routes import auth as auth_routes, user as user_routes, admin as admin_routes, coach as coach_routes, alarm as alarm_routes
import auth
from alarm_scheduler import start_scheduler, stop_scheduler, get_scheduler_status

os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/images", exist_ok=True)


Base.metadata.create_all(bind=engine)


def initial_seed_check():
    db = SessionLocal()
    try:
        # 1. Admin
        admin_user = db.query(User).filter(User.email == "admin@cognitivealarm.com").first()
        if not admin_user:
            admin_user = User(
                name="admin", email="admin@cognitivealarm.com",
                password=auth.get_password_hash("admin123"), role="administrator", provider="LOCAL"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            db.add(UserProfile(user_id=admin_user.id))
            db.commit()

        # 2. Coach
        coach_user = db.query(User).filter(User.email == "coach@cognitivealarm.com").first()
        if not coach_user:
            coach_user = User(
                name="coach", email="coach@cognitivealarm.com",
                password=auth.get_password_hash("coach123"), role="coach", provider="LOCAL"
            )
            db.add(coach_user)
            db.commit()
            db.refresh(coach_user)
            db.add(UserProfile(user_id=coach_user.id))
            db.commit()

        # 3. Standard Users
        user1 = db.query(User).filter(User.email == "user@cognitivealarm.com").first()
        if not user1:
            user1 = User(
                name="user", email="user@cognitivealarm.com",
                password=auth.get_password_hash("user123"), role="user", provider="LOCAL", coach_id=coach_user.id
            )
            db.add(user1)
            db.commit()
            db.refresh(user1)
            db.add(UserProfile(user_id=user1.id, wake_up_time="06:30", streak=5, habit_score=78))
            db.commit()

        user2 = db.query(User).filter(User.email == "emma@cognitivealarm.com").first()
        if not user2:
            user2 = User(
                name="Emma Watson", email="emma@cognitivealarm.com",
                password=auth.get_password_hash("user123"), role="user", provider="LOCAL"
            )
            db.add(user2)
            db.commit()
            db.refresh(user2)
            db.add(UserProfile(user_id=user2.id, wake_up_time="05:45", streak=14, habit_score=92))
            db.commit()

        print("Auto-seeding default records finished successfully.")
    except Exception as e:
        db.rollback()
        print(f"Auto-seed notice: {e}")
    finally:
        db.close()

initial_seed_check()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: start APScheduler on boot, stop on shutdown."""
    start_scheduler()
    print("APScheduler started — alarm background jobs running.")
    yield
    stop_scheduler()
    print("APScheduler stopped gracefully.")


app = FastAPI(
    title=Config.PROJECT_NAME,
    description="Intelligent Circadian System Panel",
    lifespan=lifespan
)


app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth APIs"])
app.include_router(user_routes.router, prefix="/api/user", tags=["User Profile APIs"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin Control APIs"])
app.include_router(coach_routes.router, prefix="/api/coach", tags=["Coach Operations APIs"])
app.include_router(alarm_routes.router, prefix="/api/alarm", tags=["Alarms APIs"])
app.include_router(alarm_routes.router, prefix="/alarms", tags=["Alarms Alias APIs"])


@app.get("/scheduler/status", response_class=JSONResponse, tags=["Scheduler"])
def scheduler_status():
    """GET /scheduler/status — Check APScheduler running state and job list."""
    return get_scheduler_status()


@app.get("/", response_class=HTMLResponse)
def get_landing(request: Request, current_user: User = Depends(auth.get_current_user)):
    return templates.TemplateResponse("landing.html", {"request": request, "user": current_user})

@app.get("/login", response_class=HTMLResponse)
def get_login(request: Request):
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