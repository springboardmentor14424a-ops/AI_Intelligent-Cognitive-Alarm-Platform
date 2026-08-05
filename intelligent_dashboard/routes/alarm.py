import datetime
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Form, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from database import get_db, Alarm, User, UserProfile, ActivityLog
import auth
from alarm_scheduler import get_scheduler_status, apply_smart_adaptive_rules, is_alarm_active_today

router = APIRouter()

# ==============================================================================
# ==============================================================================
# PYDANTIC SCHEMAS — Input Validation & AM/PM Normalization
# ==============================================================================

def parse_and_normalize_alarm_time(v: str) -> str:
    """Parses and converts 12-hour AM/PM (e.g. '07:30 AM', '9:15 PM') or 24-hour 'HH:MM' into standard 'HH:MM'."""
    if not v:
        return v
    v = v.strip()
    # 1. 12-hour AM/PM format
    am_pm_match = re.match(r"^([0]?\d|1[0-2]):([0-5]\d)\s*(AM|PM|am|pm)$", v, re.IGNORECASE)
    if am_pm_match:
        h, m, p = am_pm_match.groups()
        h_int = int(h)
        p_str = p.upper()
        if p_str == "PM" and h_int < 12:
            h_int += 12
        elif p_str == "AM" and h_int == 12:
            h_int = 0
        return f"{h_int:02d}:{m}"

    # 2. 24-hour HH:MM format
    match24 = re.match(r"^([01]?[0-9]|2[0-3]):([0-5][0-9])$", v)
    if match24:
        h, m = match24.groups()
        return f"{int(h):02d}:{m}"

    raise ValueError("alarm_time must be valid HH:MM in 24-hour format (e.g. 07:30, 21:30) or AM/PM format (e.g. 07:30 AM, 09:15 PM)")


class AlarmCreateSchema(BaseModel):
    title: Optional[str] = Field("Morning Alarm", description="Alarm label/title")
    alarm_time: str = Field(..., description="Time in HH:MM or HH:MM AM/PM format")
    alarm_type: Optional[str] = Field("Daily", description="Daily | Weekday | Weekend | One-Time | Smart Adaptive")
    repeat_days: Optional[str] = Field("Mon,Tue,Wed,Thu,Fri,Sat,Sun", description="Comma-separated days")
    is_active: Optional[bool] = Field(True)
    difficulty_level: Optional[str] = Field("Medium", description="Easy | Medium | Hard")
    sound: Optional[str] = Field("Chimes")
    vibration: Optional[bool] = Field(True)
    challenge_required: Optional[str] = Field("Math Puzzle", description="Math Puzzle | Shake Phone | Typo Solver | None")
    smart_alarm: Optional[bool] = Field(False, description="Enable Smart Adaptive rule engine")
    snooze_limit: Optional[int] = Field(3, description="Max snooze attempts allowed")

    @field_validator("alarm_time")
    @classmethod
    def validate_alarm_time(cls, v):
        return parse_and_normalize_alarm_time(v)

    @field_validator("alarm_type")
    @classmethod
    def validate_alarm_type(cls, v):
        valid = {"Daily", "Weekday", "Weekend", "One-Time", "Smart Adaptive"}
        if v and v not in valid:
            raise ValueError(f"alarm_type must be one of: {', '.join(valid)}")
        return v

    @field_validator("difficulty_level")
    @classmethod
    def validate_difficulty(cls, v):
        if v and v not in {"Easy", "Medium", "Hard"}:
            raise ValueError("difficulty_level must be Easy, Medium, or Hard")
        return v


class AlarmUpdateSchema(BaseModel):
    title: Optional[str] = None
    alarm_time: Optional[str] = None
    alarm_type: Optional[str] = None
    repeat_days: Optional[str] = None
    is_active: Optional[bool] = None
    difficulty_level: Optional[str] = None
    sound: Optional[str] = None
    vibration: Optional[bool] = None
    challenge_required: Optional[str] = None
    smart_alarm: Optional[bool] = None
    snooze_limit: Optional[int] = None

    @field_validator("alarm_time")
    @classmethod
    def validate_alarm_time(cls, v):
        return parse_and_normalize_alarm_time(v) if v else v


class FCMTokenSchema(BaseModel):
    fcm_token: str = Field(..., description="Firebase Cloud Messaging device registration token")


# ==============================================================================
# SERIALIZER
# ==============================================================================

def serialize_alarm(a: Alarm) -> dict:
    return {
        "id": a.id,
        "user_id": a.user_id,
        "title": a.title,
        "alarm_name": a.alarm_name,
        "alarm_time": a.alarm_time,
        "alarm_type": a.alarm_type or "Daily",
        "repeat_days": a.repeat_days or "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        "repeat_type": a.repeat_type,
        "is_active": a.is_active,
        "alarm_status": a.alarm_status,
        "difficulty_level": a.difficulty_level or "Medium",
        "sound": a.sound or "Chimes",
        "vibration": a.vibration,
        "smart_alarm": a.smart_alarm,
        "challenge_required": a.challenge_required,
        "snooze_count": a.snooze_count,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


# ==============================================================================
# SMART ADAPTIVE NEXT TRIGGER CALCULATOR
# ==============================================================================

def calculate_next_trigger(alarm: Alarm, profile=None) -> dict:
    """Compute next trigger datetime applying Smart Adaptive rules."""
    now = datetime.datetime.now()
    effective_time = apply_smart_adaptive_rules(alarm, profile)
    h, m = map(int, effective_time.split(":"))

    day_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
    alarm_type = alarm.alarm_type or "Daily"

    if alarm_type == "Daily":
        allowed = list(range(7))
    elif alarm_type == "Weekday":
        allowed = [0, 1, 2, 3, 4]
    elif alarm_type == "Weekend":
        allowed = [5, 6]
    elif alarm.repeat_days:
        allowed = [day_map[d.strip()] for d in alarm.repeat_days.split(",") if d.strip() in day_map]
    else:
        allowed = list(range(7))

    for i in range(8):
        check = now + datetime.timedelta(days=i)
        trigger_dt = check.replace(hour=h, minute=m, second=0, microsecond=0)
        if trigger_dt > now and check.weekday() in allowed:
            td = trigger_dt - now
            hrs, rem = divmod(int(td.total_seconds()), 3600)
            mins = rem // 60
            return {
                "next_trigger_iso": trigger_dt.isoformat(),
                "next_trigger_formatted": trigger_dt.strftime("%A, %b %d at %H:%M"),
                "time_remaining": f"{hrs}h {mins}m",
                "effective_time": effective_time,
                "smart_adaptive_applied": alarm.smart_alarm or alarm.alarm_type == "Smart Adaptive"
            }

    return {
        "next_trigger_iso": None,
        "next_trigger_formatted": "Disabled / Inactive",
        "time_remaining": "N/A",
        "effective_time": effective_time,
        "smart_adaptive_applied": False
    }


# ==============================================================================
# REST API ENDPOINTS
# ==============================================================================

@router.post("/", response_class=JSONResponse)
@router.post("", response_class=JSONResponse)
def create_alarm_api(
    payload: AlarmCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """POST /alarms — Create new alarm with full validation."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    alarm = Alarm(
        user_id=current_user.id,
        alarm_name=payload.title or "Morning Alarm",
        alarm_time=payload.alarm_time,
        alarm_type=payload.alarm_type or "Daily",
        repeat_days=payload.repeat_days or "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        repeat_type=(payload.alarm_type or "daily").lower(),
        alarm_status=True if payload.is_active is None else payload.is_active,
        difficulty_level=payload.difficulty_level or "Medium",
        sound=payload.sound or "Chimes",
        vibration=True if payload.vibration is None else payload.vibration,
        challenge_required=payload.challenge_required or "Math Puzzle",
        smart_alarm=payload.smart_alarm or False
    )
    db.add(alarm)
    log = ActivityLog(user_id=current_user.id, action="Create Alarm",
                      details=f"Created alarm '{alarm.title}' at {alarm.alarm_time} ({alarm.alarm_type})")
    db.add(log)
    db.commit()
    db.refresh(alarm)
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=serialize_alarm(alarm))


@router.get("/", response_class=JSONResponse)
@router.get("", response_class=JSONResponse)
def get_alarms_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """GET /alarms — All user alarms sorted by time."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id).order_by(Alarm.alarm_time).all()
    return JSONResponse(content=[serialize_alarm(a) for a in alarms])


@router.get("/today", response_class=JSONResponse)
def get_alarms_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """GET /alarms/today — Active alarms scheduled for today (type + repeat_days check)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    all_active = db.query(Alarm).filter(Alarm.user_id == current_user.id, Alarm.alarm_status == True).all()
    today_alarms = [serialize_alarm(a) for a in all_active if is_alarm_active_today(a)]
    return JSONResponse(content=today_alarms)


@router.get("/upcoming", response_class=JSONResponse)
def get_upcoming_alarms(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """GET /alarms/upcoming — All active alarms with next trigger datetime (sorted earliest first)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id, Alarm.alarm_status == True).all()
    result = []
    for a in alarms:
        data = serialize_alarm(a)
        data["next_trigger"] = calculate_next_trigger(a, current_user.profile)
        result.append(data)
    result.sort(key=lambda x: x["next_trigger"]["next_trigger_iso"] or "9999")
    return JSONResponse(content=result)


@router.post("/check-next", response_class=JSONResponse)
def check_next_alarm(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """POST /alarms/check-next — Smart Adaptive next alarm computation with scheduler status."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarms = db.query(Alarm).filter(Alarm.user_id == current_user.id, Alarm.alarm_status == True).all()
    if not alarms:
        return JSONResponse(content={"status": "success", "message": "No active alarms", "next_alarm": None,
                                     "scheduler": get_scheduler_status()})
    upcoming = []
    for a in alarms:
        data = serialize_alarm(a)
        data["next_trigger"] = calculate_next_trigger(a, current_user.profile)
        upcoming.append(data)
    upcoming.sort(key=lambda x: x["next_trigger"]["next_trigger_iso"] or "9999")
    return JSONResponse(content={
        "status": "success",
        "current_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "next_alarm": upcoming[0],
        "total_active": len(upcoming),
        "scheduler": get_scheduler_status()
    })


@router.get("/scheduler", response_class=JSONResponse)
def alarm_scheduler_status():
    """GET /alarms/scheduler — APScheduler background job status."""
    return JSONResponse(content=get_scheduler_status())


@router.get("/{alarm_id}", response_class=JSONResponse)
def get_single_alarm(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """GET /alarms/{id} — Single alarm with next trigger computed."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm #{alarm_id} not found")
    data = serialize_alarm(alarm)
    data["next_trigger"] = calculate_next_trigger(alarm, current_user.profile)
    return JSONResponse(content=data)


@router.put("/{alarm_id}", response_class=JSONResponse)
def update_alarm_api(
    alarm_id: int,
    payload: AlarmUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """PUT /alarms/{id} — Full alarm update."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm #{alarm_id} not found")

    if payload.title is not None: alarm.title = payload.title
    if payload.alarm_time is not None: alarm.alarm_time = payload.alarm_time
    if payload.alarm_type is not None: alarm.alarm_type = payload.alarm_type
    if payload.repeat_days is not None: alarm.repeat_days = payload.repeat_days
    if payload.is_active is not None: alarm.is_active = payload.is_active
    if payload.difficulty_level is not None: alarm.difficulty_level = payload.difficulty_level
    if payload.sound is not None: alarm.sound = payload.sound
    if payload.vibration is not None: alarm.vibration = payload.vibration
    if payload.challenge_required is not None: alarm.challenge_required = payload.challenge_required
    if payload.smart_alarm is not None: alarm.smart_alarm = payload.smart_alarm

    alarm.updated_at = datetime.datetime.utcnow()
    db.add(ActivityLog(user_id=current_user.id, action="Update Alarm",
                       details=f"Updated alarm #{alarm_id}"))
    db.commit()
    db.refresh(alarm)
    return JSONResponse(content=serialize_alarm(alarm))


@router.delete("/{alarm_id}", response_class=JSONResponse)
def delete_alarm_api(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """DELETE /alarms/{id} — Permanently delete alarm."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm #{alarm_id} not found")
    db.delete(alarm)
    db.add(ActivityLog(user_id=current_user.id, action="Delete Alarm",
                       details=f"Deleted alarm #{alarm_id}"))
    db.commit()
    return JSONResponse(content={"message": f"Alarm #{alarm_id} deleted successfully"})


@router.patch("/{alarm_id}/enable", response_class=JSONResponse)
def enable_alarm_api(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """PATCH /alarms/{id}/enable — Enable an alarm."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm #{alarm_id} not found")
    alarm.is_active = True
    alarm.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(alarm)
    return JSONResponse(content=serialize_alarm(alarm))


@router.patch("/{alarm_id}/disable", response_class=JSONResponse)
def disable_alarm_api(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """PATCH /alarms/{id}/disable — Disable an alarm."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm #{alarm_id} not found")
    alarm.is_active = False
    alarm.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(alarm)
    return JSONResponse(content=serialize_alarm(alarm))


@router.post("/fcm-token", response_class=JSONResponse)
def register_fcm_token(
    payload: FCMTokenSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    POST /alarms/fcm-token — Register device FCM token for push notifications.
    Mobile app sends this after login. Stored in users.fcm_token.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    current_user.fcm_token = payload.fcm_token
    db.commit()
    return JSONResponse(content={"message": "FCM token registered successfully"})


# ==============================================================================
# HTML FORM ENDPOINTS (UI Dashboard Compatibility)
# ==============================================================================

@router.post("/create")
def create_alarm_form(
    alarm_name: str = Form("Alarm"),
    alarm_time: str = Form(...),
    repeat_type: str = Form("daily"),
    smart_alarm: bool = Form(False),
    vibration: bool = Form(True),
    challenge_required: str = Form("None"),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    normalized_time = parse_and_normalize_alarm_time(alarm_time)
    alarm = Alarm(
        user_id=current_user.id,
        alarm_name=alarm_name,
        alarm_time=normalized_time,
        alarm_type=repeat_type.capitalize(),
        repeat_type=repeat_type,
        smart_alarm=smart_alarm,
        vibration=vibration,
        challenge_required=challenge_required,
        alarm_status=True
    )
    db.add(alarm)
    db.add(ActivityLog(user_id=current_user.id, action="Add Alarm",
                       details=f"Created alarm '{alarm_name}' at {alarm_time}"))
    db.commit()
    return RedirectResponse(url="/dashboard/user", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/toggle/{alarm_id}")
def toggle_alarm_form(
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
    state_str = "Enabled" if alarm.alarm_status else "Disabled"
    db.commit()
    return RedirectResponse(url=f"/dashboard/user?msg=Alarm+'{alarm.alarm_name}'+{state_str}", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/delete/{alarm_id}")
def delete_alarm_form(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == current_user.id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    name = alarm.alarm_name
    db.delete(alarm)
    db.commit()
    return RedirectResponse(url=f"/dashboard/user?msg=Alarm+'{name}'+Deleted+Successfully", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/simulate/{alarm_id}")
def simulate_alarm_form(
    alarm_id: int,
    outcome: str = Form(...),  # success | snooze | missed
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
        alarm.snooze_count = 0
        action, details = "Challenge Solved", f"Solved '{alarm.challenge_required}' for '{alarm.alarm_name}'"
        feedback = f"🎉+Alarm+Solved!+Habit+score:+{profile.habit_score}+(%2B3),+Streak:+{profile.streak}+days!"
    elif outcome == "snooze":
        alarm.snooze_count += 1
        profile.habit_score = max(0, profile.habit_score - 1)
        action, details = "Snoozed Alarm", f"Snoozed '{alarm.alarm_name}' (count: {alarm.snooze_count})"
        feedback = f"⏰+Alarm+Snoozed!+Snooze+count:+{alarm.snooze_count},+Habit+score:+{profile.habit_score}+(-1)"
    else:  # missed
        profile.streak = 0
        profile.habit_score = max(0, profile.habit_score - 5)
        action, details = "Alarm Missed", f"Missed '{alarm.alarm_name}'"
        feedback = f"❌+Alarm+Missed!+Streak+reset+to+0,+Habit+score:+{profile.habit_score}+(-5)"

    db.add(ActivityLog(user_id=current_user.id, action=action, details=details))
    db.commit()
    return RedirectResponse(url=f"/dashboard/user?msg={feedback}", status_code=status.HTTP_303_SEE_OTHER)
