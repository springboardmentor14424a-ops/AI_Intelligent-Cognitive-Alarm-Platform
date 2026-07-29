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
    user_exists = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Username or email already exists")
        
    db_user = User(
        full_name=full_name,
        username=username,
        email=email,
        password_hash=auth.get_password_hash(password),
        role=role,
        provider="local",
        email_verified=False,
        account_status="active"
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
    access_token = auth.create_access_token(db_user.username, db_user.role)
    refresh_token = auth.create_refresh_token(db_user.username, db_user.role)
    
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
    user = db.query(User).filter(User.username == username).first()
    if not user or not auth.verify_password(password, user.password_hash):
        if user:
            user.login_attempts += 1
            if user.login_attempts >= 5:
                user.account_status = "suspended"
            db.commit()
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    if user.account_status == "suspended":
        raise HTTPException(status_code=400, detail="Account is suspended.")
        
    user.login_attempts = 0
    user.last_login = datetime.datetime.utcnow()
    
    # Log
    log = ActivityLog(user_id=user.id, action="Login", details="Logged in successfully")
    db.add(log)
    db.commit()
    
    access_token = auth.create_access_token(user.username, user.role)
    refresh_token = auth.create_refresh_token(user.username, user.role)
    
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
        
    reset_token = auth.create_access_token(user.username, user.role, expires_delta=datetime.timedelta(minutes=15))
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
        
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = auth.get_password_hash(new_password)
    user.login_attempts = 0
    
    log = ActivityLog(user_id=user.id, action="Password Change", details="Password reset completed via token")
    db.add(log)
    db.commit()
    return {"message": "Password reset completed successfully"}

@router.get("/google-login-bypass")
def google_login_bypass(email: str = "google_user@cognitivealarm.com", db: Session = Depends(get_db)):
    username = email.split("@")[0]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name="Google User",
            username=username,
            email=email,
            password_hash=auth.get_password_hash("GoogleBypassPass123!"),
            role="user",
            provider="google",
            email_verified=True,
            account_status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        
        log = ActivityLog(user_id=user.id, action="Register", details="Registered via Google OAuth bypass")
        db.add(log)
        db.commit()
    else:
        user.last_login = datetime.datetime.utcnow()
        log = ActivityLog(user_id=user.id, action="Login", details="Logged in via Google OAuth")
        db.add(log)
        db.commit()
        
    access_token = auth.create_access_token(user.username, user.role)
    refresh_token = auth.create_refresh_token(user.username, user.role)
    
    target = f"/dashboard/{user.role}"
    redirect = RedirectResponse(url=target, status_code=status.HTTP_303_SEE_OTHER)
    redirect.set_cookie(key="access_token", value=access_token, httponly=True)
    redirect.set_cookie(key="refresh_token", value=refresh_token, httponly=True)
    return redirect
