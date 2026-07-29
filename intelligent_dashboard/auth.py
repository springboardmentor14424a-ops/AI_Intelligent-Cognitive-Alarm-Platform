import datetime
import bcrypt
from typing import Union, Any, Optional
from jose import jwt
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from config import Config
from database import get_db

# We need to import our database models later
# We'll write models in a schema SQL / Models file. Let's make sure we import User properly.

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], role: str, expires_delta: datetime.timedelta = None) -> str:
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "role": role, "type": "access"}
    return jwt.encode(to_encode, Config.SECRET_KEY, algorithm="HS256")

def create_refresh_token(subject: Union[str, Any], role: str, expires_delta: datetime.timedelta = None) -> str:
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=Config.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "role": role, "type": "refresh"}
    return jwt.encode(to_encode, Config.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return {}

def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Fetch current user checking cookies first (standard for browser templates)."""
    token = request.cookies.get("access_token")
    if not token:
        # Check authorization header if API call
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None
        
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
        
    username = payload.get("sub")
    if not username:
        return None
        
    from database import engine
    # To prevent circular import, we fetch User directly in function scope
    from routes.user import get_user_by_username
    user = get_user_by_username(db, username)
    return user
