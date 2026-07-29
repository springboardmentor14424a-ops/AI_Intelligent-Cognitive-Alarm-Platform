from fastapi import APIRouter, Depends, HTTPException, Form, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, User, UserProfile, Notification, ActivityLog, Report
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
        profile.productivity_goal = f"Coach Note: {notes}"
        
    # Log
    log = ActivityLog(user_id=current_coach.id, action="Update Profile", details=f"Coach updated notes for client: {user.username}")
    db.add(log)
    
    # Save as a weekly report recommendation
    today = datetime.date.today()
    report = Report(
        user_id=user.id,
        report_type="weekly",
        start_date=today - datetime.timedelta(days=7),
        end_date=today,
        average_sleep_duration=profile.sleep_duration if profile else 8.0,
        wake_up_consistency=90.0,
        challenge_completion_rate=95.0,
        habit_score=profile.habit_score if profile else 50,
        recommendation_notes=notes
    )
    db.add(report)
    
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
        
    notification = Notification(
        user_id=user.id,
        title="Coach Sarah Motivation",
        message=message,
        type="coach",
        read_status=False
    )
    db.add(notification)
    
    log = ActivityLog(user_id=current_coach.id, action="Coach Message", details=f"Coach sent motivation note to client: {user.username}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/coach", status_code=status.HTTP_303_SEE_OTHER)
