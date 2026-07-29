from fastapi import APIRouter, Depends, HTTPException, Form, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db, Alarm, User, UserProfile, ActivityLog
import auth

router = APIRouter()

@router.post("/create")
def create_alarm(
    alarm_name: str = Form("Alarm"),
    alarm_time: str = Form(...),
    repeat_type: str = Form("once"),
    smart_alarm: bool = Form(False),
    volume: float = Form(0.8),
    vibration: bool = Form(True),
    challenge_required: str = Form("None"),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    alarm = Alarm(
        user_id=current_user.id,
        alarm_name=alarm_name,
        alarm_time=alarm_time,
        repeat_type=repeat_type,
        smart_alarm=smart_alarm,
        volume=volume,
        vibration=vibration,
        challenge_required=challenge_required,
        alarm_status=True
    )
    db.add(alarm)
    
    # Log
    log = ActivityLog(user_id=current_user.id, action="Add Alarm", details=f"Created alarm '{alarm_name}' at {alarm_time}")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/user", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/toggle/{alarm_id}")
def toggle_alarm(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
        
    alarm.alarm_status = not alarm.alarm_status
    log = ActivityLog(user_id=current_user.id, action="Update Alarm", details=f"Toggled alarm '{alarm.alarm_name}' status")
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/user", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/delete/{alarm_id}")
def delete_alarm(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
        
    log = ActivityLog(user_id=current_user.id, action="Delete Alarm", details=f"Deleted alarm '{alarm.alarm_name}'")
    db.delete(alarm)
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/user", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/simulate/{alarm_id}")
def simulate_alarm(
    alarm_id: int,
    outcome: str = Form(...), # success, snooze, missed
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
        
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        
    if outcome == "success":
        profile.streak += 1
        profile.habit_score = min(100, profile.habit_score + 3)
        log_action = "Challenge Solved"
        log_details = f"Solved '{alarm.challenge_required}' challenge and woke up for alarm '{alarm.alarm_name}'"
    elif outcome == "snooze":
        profile.habit_score = max(0, profile.habit_score - 1)
        log_action = "Snoozed Alarm"
        log_details = f"Snoozed alarm '{alarm.alarm_name}'"
    else:  # missed
        profile.streak = 0
        profile.habit_score = max(0, profile.habit_score - 5)
        log_action = "Alarm Missed"
        log_details = f"Missed alarm '{alarm.alarm_name}'"
        
    log = ActivityLog(user_id=current_user.id, action=log_action, details=log_details)
    db.add(log)
    db.commit()
    
    return RedirectResponse(url="/dashboard/user", status_code=status.HTTP_303_SEE_OTHER)
