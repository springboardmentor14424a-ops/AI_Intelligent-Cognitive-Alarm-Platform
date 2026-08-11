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
