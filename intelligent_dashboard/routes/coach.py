from fastapi import APIRouter, Depends, HTTPException, Form, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, Notification, ActivityLog
import auth
import datetime

router = APIRouter()

@router.post("/notes/{user_id}")
def update_coach_notes(
    user_id: int,
    notes: str = Form(...),
    db: Session = Depends(get_db),
    current_coach: User = Depends(auth.get_current_user)
):
    if not current_coach or current_coach.role not in ['coach', 'administrator']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id, User.coach_id == current_coach.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client not assigned to you")
        
    profile = user.profile
    if profile:
        profile.productivity_goal = f"Coach Note from {current_coach.full_name or current_coach.username}: {notes}"
        
    # Log
    log = ActivityLog(user_id=current_coach.id, action="Update Profile", details=f"Coach updated notes for client: {user.username}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/coach", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/message/{user_id}")
def send_coach_message(
    user_id: int,
    message: str = Form(...),
    db: Session = Depends(get_db),
    current_coach: User = Depends(auth.get_current_user)
):
    if not current_coach or current_coach.role not in ['coach', 'administrator']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id, User.coach_id == current_coach.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client not assigned to you")
    
    coach_name = current_coach.full_name or current_coach.username or "Your Coach"
    notification = Notification(
        user_id=user.id,
        title=f"Coach {coach_name} — Motivation",
        message=message,
        type="coach",
        read_status=False
    )
    db.add(notification)
    
    log = ActivityLog(user_id=current_coach.id, action="Coach Message", details=f"Coach sent motivation note to client: {user.username}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/coach", status_code=status.HTTP_303_SEE_OTHER)


@router.get("/client/{user_id}/analytics")
def get_client_analytics(
    user_id: int,
    db: Session = Depends(get_db),
    current_coach: User = Depends(auth.get_current_user)
):
    """Provides Wellness Coach with detailed user behavior insights, habit adherence analytics, sleep trend reports, and progress monitoring for an assigned client."""
    if not current_coach or current_coach.role not in ['coach', 'administrator']:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client not found")

    from habit_engine import HabitScoringEngine
    from behavioral_analytics import BehavioralAnalyticsEngine
    from database import WakeLog, SleepAdherenceLog, ChallengePerformance

    habit_data = HabitScoringEngine.compute_and_persist_habit_score(user_id, db)
    behavioral_data = BehavioralAnalyticsEngine.get_full_behavioral_dossier(user_id, db)
    wake_logs = db.query(WakeLog).filter(WakeLog.user_id == user_id).order_by(WakeLog.created_at.desc()).limit(7).all()
    sleep_logs = db.query(SleepAdherenceLog).filter(SleepAdherenceLog.user_id == user_id).order_by(SleepAdherenceLog.created_at.desc()).limit(7).all()
    challenges = db.query(ChallengePerformance).filter(ChallengePerformance.user_id == user_id).order_by(ChallengePerformance.created_at.desc()).limit(10).all()

    return {
        "success": True,
        "user_id": user_id,
        "username": user.username,
        "full_name": user.full_name or user.username,
        "habit_score": habit_data,
        "behavioral_insights": behavioral_data,
        "sleep_adherence_logs": [
            {
                "id": s.id,
                "adhered": s.adhered,
                "target_bedtime": s.target_bedtime,
                "target_wake_time": s.target_wake_time,
                "score": s.score,
                "notes": s.notes,
                "created_at": s.created_at.strftime('%Y-%m-%d') if s.created_at else None
            }
            for s in sleep_logs
        ],
        "wake_logs": [
            {
                "id": w.id,
                "scheduled_time": w.scheduled_time,
                "actual_wake_time": w.actual_wake_time,
                "drift_minutes": w.drift_minutes,
                "snooze_count": w.snooze_count,
                "wakefulness_rating": w.wakefulness_rating,
                "created_at": w.created_at.strftime('%Y-%m-%d') if w.created_at else None
            }
            for w in wake_logs
        ],
        "challenges": [
            {
                "id": ch.id,
                "challenge_type": ch.challenge_type,
                "difficulty": ch.difficulty,
                "accuracy": ch.accuracy,
                "status": ch.status,
                "score": ch.score
            }
            for ch in challenges
        ]
    }

