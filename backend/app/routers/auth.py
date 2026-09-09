from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Admin is intentionally not selectable from public signup — only reachable
# via the seeded demo account. Anyone could otherwise grant themselves admin.
SELF_SERVICE_ROLES = {"user", "wellness_coach"}


@router.post("/register", response_model=schemas.Token)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = payload.role if payload.role in SELF_SERVICE_ROLES else "user"

    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/demo-login", response_model=schemas.Token)
def demo_login(payload: schemas.DemoLoginRequest, db: Session = Depends(get_db)):
    """
    One-click demo accounts (seeded at startup — see app/seed.py). Lets you
    try Admin / Wellness Coach / User views instantly without registering.
    """
    role_map = {
        "admin": "demo.admin@cognitivealarm.dev",
        "wellness_coach": "demo.coach@cognitivealarm.dev",
        "user": "demo.user@cognitivealarm.dev",
    }
    email = role_map.get(payload.role)
    if not email:
        raise HTTPException(status_code=400, detail="Unknown demo role")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not seeded yet — restart the server")

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    field_map = {
        "preferred_wake_time": payload.preferred_wake_time,
        "difficulty_preference": payload.difficulty_preference,
        "timezone": payload.timezone,
        "target_sleep_time": payload.target_sleep_time,
        "sleep_duration_hours": payload.sleep_duration_hours,
        "challenge_type_preference": payload.challenge_type_preference,
        "snooze_duration_minutes": payload.snooze_duration_minutes,
        "max_snoozes": payload.max_snoozes,
        "ringtone": payload.ringtone,
        "vibration_enabled": payload.vibration_enabled,
        "gradual_volume": payload.gradual_volume,
        "theme": payload.theme,
        "phone": payload.phone,
        "avatar_emoji": payload.avatar_emoji,
    }
    for field, value in field_map.items():
        if value is not None:
            setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
