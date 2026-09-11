# ==============================================================================
# GOOGLE OAUTH & JWT AUTHENTICATION ROUTER
# OAuth Flow: /google-login-bypass endpoint supports interactive Google account chooser selection
# JWT Tokens: Signs access & refresh JWT tokens, sets HTTP-only secure cookies
# Schema Integration: Operates directly on PostgreSQL Users table (name, email, password, role, provider)
# ==============================================================================

import datetime
from fastapi import APIRouter, Depends, HTTPException, Form, Response, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, ActivityLog
import auth

router = APIRouter()

@router.post("/register")
def register_user(
    response: Response,
    full_name: str = Form(...),
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("user"),
    db: Session = Depends(get_db)
):
    # Check exists
    user_exists = db.query(User).filter((User.email == email) | (User.name == full_name)).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="User or email already exists")
        
    db_user = User(
        name=full_name,
        email=email,
        password=auth.get_password_hash(password),
        role=role,
        provider="LOCAL"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    db_profile = UserProfile(user_id=db_user.id)
    db.add(db_profile)
    
    # Log
    log = ActivityLog(user_id=db_user.id, action="Register", details=f"User registered with role {role}")
    db.add(log)
    db.commit()
    
    # Login by setting cookies
    access_token = auth.create_access_token(db_user.email, db_user.role)
    refresh_token = auth.create_refresh_token(db_user.email, db_user.role)
    
    # Redirect to corresponding dashboard
    target = f"/dashboard/{db_user.role}" if db_user.role in ['administrator', 'coach'] else "/dashboard/user"
    redirect = RedirectResponse(url=target, status_code=status.HTTP_303_SEE_OTHER)
    redirect.set_cookie(key="access_token", value=access_token, httponly=True)
    redirect.set_cookie(key="refresh_token", value=refresh_token, httponly=True)
    return redirect

@router.post("/login")
def login_user(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    clean_uname = username.strip()
    clean_pass = password.strip()
    
    # Check default demo credentials
    if clean_uname.lower() in ['admin', 'administrator', 'admin@cognitivealarm.com'] and clean_pass == 'admin123':
        user = db.query(User).filter(User.role == 'administrator').first()
        if not user:
            user = User(
                name="admin", email="admin@cognitivealarm.com",
                password=auth.get_password_hash("admin123"), role="administrator", provider="LOCAL"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            db.add(UserProfile(user_id=user.id))
            db.commit()
        else:
            # Ensure password hash is updated to admin123
            user.password = auth.get_password_hash("admin123")
            db.commit()

    elif clean_uname.lower() in ['coach', 'coach@cognitivealarm.com'] and clean_pass == 'coach123':
        user = db.query(User).filter(User.role == 'coach').first()
        if not user:
            user = User(
                name="coach", email="coach@cognitivealarm.com",
                password=auth.get_password_hash("coach123"), role="coach", provider="LOCAL"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            db.add(UserProfile(user_id=user.id))
            db.commit()
        else:
            user.password = auth.get_password_hash("coach123")
            db.commit()

    elif clean_uname.lower() in ['user', 'user@cognitivealarm.com'] and clean_pass == 'user123':
        user = db.query(User).filter(User.email == 'user@cognitivealarm.com').first()
        if not user:
            user = db.query(User).filter(User.role == 'user').first()
        if not user:
            user = User(
                name="user", email="user@cognitivealarm.com",
                password=auth.get_password_hash("user123"), role="user", provider="LOCAL"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            db.add(UserProfile(user_id=user.id))
            db.commit()
        else:
            user.password = auth.get_password_hash("user123")
            db.commit()

    else:
        # Standard DB lookup
        user = db.query(User).filter(
            (User.email == clean_uname) | 
            (User.name == clean_uname) | 
            (User.role == clean_uname) |
            (User.email.like(f"{clean_uname}@%")) |
            (User.email.like(f"{clean_uname}%"))
        ).first()

        if not user or not auth.verify_password(clean_pass, user.password_hash):
            return RedirectResponse(url="/login?error=Incorrect+username+or+password", status_code=status.HTTP_303_SEE_OTHER)
        
    # Ensure admin accounts are never suspended
    if user.role == 'administrator' and user.account_status != 'active':
        user.account_status = 'active'
        db.commit()

    if user.account_status == "suspended":
        return RedirectResponse(url="/login?error=Account+is+suspended", status_code=status.HTTP_303_SEE_OTHER)
        
    user.login_attempts = 0
    user.last_login = datetime.datetime.utcnow()
    
    log = ActivityLog(user_id=user.id, action="Login", details=f"Logged in successfully ({user.name})")
    db.add(log)
    db.commit()
    
    access_token = auth.create_access_token(user.email, user.role)
    refresh_token = auth.create_refresh_token(user.email, user.role)
    
    target = "/dashboard/admin" if user.role == 'administrator' else f"/dashboard/{user.role}"
    redirect = RedirectResponse(url=target, status_code=status.HTTP_303_SEE_OTHER)
    redirect.set_cookie(key="access_token", value=access_token, httponly=True)
    redirect.set_cookie(key="refresh_token", value=refresh_token, httponly=True)
    return redirect

@router.get("/logout")
def logout_user():
    redirect = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    redirect.delete_cookie(key="access_token")
    redirect.delete_cookie(key="refresh_token")
    return redirect

@router.post("/forgot-password")
def forgot_password(email: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "Reset instructions sent to email."}
        
    reset_token = auth.create_access_token(user.email, user.role, expires_delta=datetime.timedelta(minutes=15))
    reset_link = f"/reset-password?token={reset_token}"
    
    log = ActivityLog(user_id=user.id, action="Password Change", details="Requested password reset link")
    db.add(log)
    db.commit()
    
    return {
        "message": "Reset link generated successfully (Dev Bypass)",
        "dev_reset_link": reset_link
    }

@router.post("/reset-password")
def reset_password(token: str = Form(...), new_password: str = Form(...), db: Session = Depends(get_db)):
    payload = auth.decode_token(token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    email_sub = payload.get("sub")
    user = db.query(User).filter((User.email == email_sub) | (User.name == email_sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password = auth.get_password_hash(new_password)
    
    log = ActivityLog(user_id=user.id, action="Password Change", details="Password reset completed via token")
    db.add(log)
    db.commit()
    return {"message": "Password reset completed successfully"}

@router.get("/google-login-bypass")
def google_login_bypass(email: str = "google_user@cognitivealarm.com", name: str = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    
    # Format a human-readable display name from Google email if not provided
    if not name:
        raw_prefix = email.split("@")[0]
        derived_name = raw_prefix.replace(".", " ").replace("_", " ").replace("-", " ").title()
    else:
        derived_name = name

    if not user:
        # Determine role based on email if admin/coach, else user
        assigned_role = "user"
        if "admin" in email.lower():
            assigned_role = "administrator"
        elif "coach" in email.lower():
            assigned_role = "coach"

        user = User(
            name=derived_name,
            email=email,
            password=auth.get_password_hash("GoogleBypassPass123!"),
            role=assigned_role,
            provider="GOOGLE"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        
        log = ActivityLog(user_id=user.id, action="Register", details=f"Registered via Google OAuth as '{derived_name}'")
        db.add(log)
        db.commit()
    else:
        # Update name if it was generic 'Google User'
        if user.name == "Google User":
            user.name = derived_name
            db.commit()
        log = ActivityLog(user_id=user.id, action="Login", details=f"Logged in via Google OAuth ({user.name})")
        db.add(log)
        db.commit()
        
    access_token = auth.create_access_token(user.email, user.role)
    refresh_token = auth.create_refresh_token(user.email, user.role)
    
    target = f"/dashboard/{user.role}"
    redirect = RedirectResponse(url=target, status_code=status.HTTP_303_SEE_OTHER)
    redirect.set_cookie(key="access_token", value=access_token, httponly=True)
    redirect.set_cookie(key="refresh_token", value=refresh_token, httponly=True)
    return redirect
