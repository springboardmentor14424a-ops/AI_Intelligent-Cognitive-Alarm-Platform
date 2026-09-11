from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Form, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, Notification, ActivityLog, Appointment
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
    from behavioral_engine import BehavioralAnalyticsEngine
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


# =====================================================================
# COACH APPOINTMENTS — Client & Wellness Coach Interaction
# =====================================================================

@router.get("/appointments", response_class=JSONResponse)
def get_coach_appointments(
    db: Session = Depends(get_db),
    current_coach: User = Depends(auth.get_current_user)
):
    """Retrieve all client appointments assigned to this coach or unassigned."""
    if not current_coach or current_coach.role not in ['coach', 'administrator']:
        raise HTTPException(status_code=403, detail="Not authorized")

    appts = db.query(Appointment).filter(
        (Appointment.coach_id == current_coach.id) | (Appointment.coach_id == None)
    ).order_by(Appointment.created_at.desc()).all()

    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "user_name": a.user_name,
            "coach_name": a.coach_name,
            "appointment_time": a.appointment_time,
            "reason": a.reason,
            "status": a.status,
            "notes": a.notes or "",
            "created_at": a.created_at.strftime('%Y-%m-%d %H:%M') if a.created_at else None
        }
        for a in appts
    ]


@router.post("/appointment/update-status", response_class=JSONResponse)
def update_appointment_status(
    appointment_id: int = Form(...),
    status: str = Form(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_coach: User = Depends(auth.get_current_user)
):
    """Coach updates appointment status (Confirmed, Completed, Cancelled)."""
    if not current_coach or current_coach.role not in ['coach', 'administrator']:
        raise HTTPException(status_code=403, detail="Not authorized")

    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = status
    if notes:
        appt.notes = notes
    db.commit()

    # Send Notification to User
    coach_name = current_coach.full_name or current_coach.username
    notif = Notification(
        user_id=appt.user_id,
        title=f"📅 Appointment {status}",
        message=f"Coach {coach_name} marked your appointment for {appt.appointment_time} as '{status}'. {notes or ''}",
        type="coach",
        read_status=False
    )
    db.add(notif)
    db.commit()

    return {"success": True, "message": f"Appointment marked as {status}!"}


@router.post("/appointment/schedule", response_class=JSONResponse)
def coach_schedule_appointment(
    user_id: int = Form(...),
    appointment_time: str = Form(...),
    reason: str = Form(...),
    db: Session = Depends(get_db),
    current_coach: User = Depends(auth.get_current_user)
):
    """Coach directly schedules an appointment with a client asking client name/id, time, and reason."""
    if not current_coach or current_coach.role not in ['coach', 'administrator']:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client user not found")

    coach_name = current_coach.full_name or current_coach.username or "Wellness Coach"
    appt = Appointment(
        user_id=user.id,
        coach_id=current_coach.id,
        user_name=user.full_name or user.username,
        coach_name=coach_name,
        appointment_time=appointment_time.strip(),
        reason=reason.strip(),
        status="Confirmed"
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    notif = Notification(
        user_id=user.id,
        title="📅 Coach Scheduled 1-on-1 Session",
        message=f"Coach {coach_name} scheduled a 1-on-1 session with you for {appointment_time.strip()}. Reason: {reason.strip()}",
        type="coach",
        read_status=False
    )
    db.add(notif)
    db.commit()

    return {
        "success": True,
        "message": f"Appointment scheduled with {user.full_name or user.username} for {appointment_time}!",
        "appointment_id": appt.id
    }


