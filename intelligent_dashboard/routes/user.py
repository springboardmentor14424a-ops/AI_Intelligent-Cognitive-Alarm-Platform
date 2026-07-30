import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, ActivityLog
import auth

router = APIRouter()

def get_user_by_username(db: Session, username: str):
    if not username:
        return None
    if username.isdigit():
        user_by_id = db.query(User).filter(User.id == int(username)).first()
        if user_by_id:
            return user_by_id
    return db.query(User).filter(
        (User.email == username) | 
        (User.name == username) | 
        (User.email.like(f"{username}@%"))
    ).first()

@router.get("/me")
def get_my_profile(current_user: User = Depends(auth.get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@router.post("/update")
def update_my_profile(
    full_name: str = Form(...),
    phone: str = Form(None),
    wake_up_time: str = Form("07:00"),
    sleep_time: str = Form("22:30"),
    sleep_duration: float = Form(8.0),
    preferred_alarm_sound: str = Form("Chimes"),
    challenge_preference: str = Form("Math Puzzle"),
    difficulty_level: str = Form("medium"),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    current_user.full_name = full_name
    current_user.phone = phone
    
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(current_user)
        profile = current_user.profile
        
    profile.wake_up_time = wake_up_time
    profile.sleep_time = sleep_time
    profile.sleep_duration = sleep_duration
    profile.preferred_alarm_sound = preferred_alarm_sound
    profile.challenge_preference = challenge_preference
    profile.difficulty_level = difficulty_level
    
    # Log
    log = ActivityLog(user_id=current_user.id, action="Update Profile", details="Updated personal details and circadian targets")
    db.add(log)
    
    db.commit()
    return {"message": "Profile updated successfully"}

@router.post("/change-password")
def change_password(
    old_password: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    if not auth.verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.password_hash = auth.get_password_hash(new_password)
    log = ActivityLog(user_id=current_user.id, action="Password Change", details="Changed account password")
    db.add(log)
    db.commit()
    return {"message": "Password changed successfully"}

@router.post("/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    upload_dir = "static/images"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"avatar_{current_user.id}{file_ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.profile_image = f"/static/images/{filename}"
    log = ActivityLog(user_id=current_user.id, action="Update Profile", details=f"Uploaded profile image: {filename}")
    db.add(log)
    db.commit()
    
    return {"message": "Avatar uploaded successfully", "profile_image": current_user.profile_image}
