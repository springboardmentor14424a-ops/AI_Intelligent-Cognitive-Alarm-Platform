"""
JWT authentication utilities (PDF section 4.1: JWT authentication, role-based access).
"""
import datetime
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

# NOTE: In production, load this from an environment variable / secrets manager.
# It is hardcoded here only so the project runs immediately with zero setup.
SECRET_KEY = "dev-only-secret-change-me-before-any-real-deployment"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours, convenient for demoing

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Using the `bcrypt` library directly (instead of passlib) — passlib==1.7.4
# depends on an internal bcrypt attribute that newer bcrypt releases removed,
# which throws on every hash/verify call. Calling bcrypt directly sidesteps
# that whole class of version-mismatch bugs.
_BCRYPT_MAX_BYTES = 72  # bcrypt silently truncates beyond this; we enforce it explicitly


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.checkpw(plain_bytes, hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (
        expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*allowed_roles: str):
    """Role-based access control dependency (PDF: Role-based access control)."""
    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user
    return checker
