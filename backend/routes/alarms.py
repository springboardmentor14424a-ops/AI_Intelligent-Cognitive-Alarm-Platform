import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer

from database import get_db
from models import Alarm, User
from schemas import AlarmCreate, AlarmUpdate, AlarmResponse, CheckNextRequest, CheckNextResponse
from routes.auth import get_current_user
from scheduler import triggered_alarms

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def get_optional_user(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except Exception:
        return None


router = APIRouter(prefix="/api/alarms", tags=["Alarms"])

@router.post("/", response_model=AlarmResponse, status_code=status.HTTP_201_CREATED)
def create_alarm(payload: AlarmCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_alarm = Alarm(
        user_id=current_user.id,
        title=payload.title,
        alarm_time=payload.alarm_time,
        alarm_type=payload.alarm_type,
        repeat_days=payload.repeat_days,
        is_active=payload.is_active,
        challenge=payload.challenge,
        difficulty_level=payload.difficulty_level,
        sound=payload.sound,
        vibration=payload.vibration
    )
    db.add(db_alarm)
    db.commit()
    db.refresh(db_alarm)
    return db_alarm

@router.get("/", response_model=List[AlarmResponse])
def list_alarms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alarm).filter(Alarm.user_id == current_user.id).all()

# Helper function to check if alarm triggers today
def triggers_today(alarm: Alarm, today_name: str, today_is_weekend: bool) -> bool:
    if not alarm.is_active:
        return False
    if alarm.alarm_type == "Daily":
        return True
    elif alarm.alarm_type in {"Weekday", "Weekdays"}:
        return not today_is_weekend
    elif alarm.alarm_type in {"Weekend", "Weekends"}:
        return today_is_weekend
    elif alarm.alarm_type == "One-Time":
        return True # For simplicity, a one-time active alarm is listed for today
    elif alarm.alarm_type == "Smart Adaptive":
        return True
    else: # Custom repeat days
        days = [d.strip() for d in alarm.repeat_days.split(",") if d.strip()]
        return today_name in days

@router.get("/today", response_model=List[AlarmResponse])
def get_alarms_today(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.datetime.now()
    # Weekday names matching repeat_days: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today_name = day_names[now.weekday()]
    today_is_weekend = now.weekday() in (5, 6)

    user_alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id, Alarm.is_active == True).all()
    today_alarms = [a for a in user_alarms if triggers_today(a, today_name, today_is_weekend)]
    return today_alarms

def calculate_next_trigger(alarm: Alarm, base_dt: datetime.datetime) -> datetime.datetime:
    try:
        h, m = map(int, alarm.alarm_time.split(":"))
    except ValueError:
        h, m = 0, 0
    
    day_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
    active_days = set()
    
    if alarm.alarm_type == "Daily":
        active_days = {0, 1, 2, 3, 4, 5, 6}
    elif alarm.alarm_type in {"Weekday", "Weekdays"}:
        active_days = {0, 1, 2, 3, 4}
    elif alarm.alarm_type in {"Weekend", "Weekends"}:
        active_days = {5, 6}
    elif alarm.alarm_type in {"Custom", "Smart Adaptive"}:
        days = [d.strip() for d in alarm.repeat_days.split(",") if d.strip()]
        for d in days:
            if d in day_map:
                active_days.add(day_map[d])
    else:
        days = [d.strip() for d in alarm.repeat_days.split(",") if d.strip()]
        for d in days:
            if d in day_map:
                active_days.add(day_map[d])
    
    if not active_days:
        active_days = {0, 1, 2, 3, 4, 5, 6}
        
    for offset in range(8):
        check_dt = base_dt + datetime.timedelta(days=offset)
        check_day = check_dt.weekday()
        if check_day in active_days:
            candidate = check_dt.replace(hour=h, minute=m, second=0, microsecond=0)
            if candidate > base_dt:
                return candidate
    
    return base_dt + datetime.timedelta(days=1)

@router.get("/upcoming", response_model=List[AlarmResponse])
def get_upcoming_alarms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id, Alarm.is_active == True).all()
    now = datetime.datetime.now()
    sorted_alarms = sorted(user_alarms, key=lambda a: calculate_next_trigger(a, now))
    return sorted_alarms

@router.get("/triggered")
def get_triggered_alarms(current_user: Optional[User] = Depends(get_optional_user)):
    import scheduler
    if current_user:
        alarms = [a for a in scheduler.triggered_alarms if a.get("user_id") == current_user.id or a.get("user_id") is None]
        scheduler.triggered_alarms = [a for a in scheduler.triggered_alarms if not (a.get("user_id") == current_user.id or a.get("user_id") is None)]
    else:
        alarms = list(scheduler.triggered_alarms)
        scheduler.triggered_alarms.clear()
    return alarms

@router.post("/check-next", response_model=CheckNextResponse)
def check_next_alarm(payload: CheckNextRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    base_time = payload.base_time or datetime.datetime.now()
    if base_time.tzinfo is not None:
        base_time = base_time.replace(tzinfo=None)
        
    active_alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id, Alarm.is_active == True).all()
    if not active_alarms:
        return CheckNextResponse(next_alarm=None, next_trigger=None, time_remaining_seconds=None)
        
    next_triggers = []
    for alarm in active_alarms:
        trigger_dt = calculate_next_trigger(alarm, base_time)
        next_triggers.append((alarm, trigger_dt))
        
    next_triggers.sort(key=lambda item: item[1])
    earliest_alarm, earliest_dt = next_triggers[0]
    diff = (earliest_dt - base_time).total_seconds()
    
    return CheckNextResponse(
        next_alarm=AlarmResponse.model_validate(earliest_alarm),
        next_trigger=earliest_dt,
        time_remaining_seconds=diff
    )

@router.get("/{id}", response_model=AlarmResponse)
def get_alarm(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alarm = db.query(Alarm).filter(Alarm.id == id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    return alarm

@router.put("/{id}", response_model=AlarmResponse)
def update_alarm(id: int, payload: AlarmUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alarm = db.query(Alarm).filter(Alarm.id == id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alarm, key, value)
        
    db.commit()
    db.refresh(alarm)
    return alarm

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_alarm(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alarm = db.query(Alarm).filter(Alarm.id == id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    db.delete(alarm)
    db.commit()
    return {"status": "success", "message": "Alarm deleted successfully"}

@router.patch("/{id}/enable", response_model=AlarmResponse)
def enable_alarm(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alarm = db.query(Alarm).filter(Alarm.id == id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    alarm.is_active = True
    db.commit()
    db.refresh(alarm)
    return alarm

@router.patch("/{id}/disable", response_model=AlarmResponse)
def disable_alarm(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alarm = db.query(Alarm).filter(Alarm.id == id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    alarm.is_active = False
    db.commit()
    db.refresh(alarm)
    return alarm