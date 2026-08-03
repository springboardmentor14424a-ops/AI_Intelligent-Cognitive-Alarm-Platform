import logging
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from typing import List

from database import get_db
from models import User
from schemas import (
    UserRegister, 
    UserResponse, 
    RegisterSuccessResponse, 
    UserLogin, 
    GoogleOAuthRequest,
    Token
)
from security import hash_password, verify_password, create_access_token
from config import settings

# Optional Google Auth library verification
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post(
    "/register", 
    response_model=RegisterSuccessResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Backend Process:\n1. Receive request\n2. Validate data\n3. Check email already exists\n4. Hash password using BCrypt\n5. Save into database\n6. Return success response"
)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Step 2: Registration API endpoint matching screenshot specification.
    """
    try:
        # 3. Check if email already exists in PostgreSQL DB
        existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with email '{payload.email}' already exists."
            )

        # 4. Hash password using BCrypt
        hashed_pwd = hash_password(payload.password)

        # 5. Save into database
        new_user = User(
            name=payload.name.strip(),
            email=payload.email.lower().strip(),
            password=hashed_pwd,
            role=payload.role.strip() if payload.role else "USER",
            provider=payload.provider.strip() if payload.provider else "LOCAL"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # 6. Return success response
        return RegisterSuccessResponse(
            status="success",
            message="User registered successfully in PostgreSQL database",
            data=UserResponse.model_validate(new_user)
        )

    except OperationalError as e:
        logger.error(f"PostgreSQL connection error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to PostgreSQL database. Please check PostgreSQL password in backend/.env or start PostgreSQL service."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal registration error: {str(e)}"
        )

@router.post("/login", response_model=Token, summary="Authenticate user & return JWT token")
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates registered user credentials against PostgreSQL DB.
    """
    try:
        user = db.query(User).filter(User.email == payload.email.lower()).first()
        if not user or not verify_password(payload.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    except OperationalError as e:
        logger.error(f"PostgreSQL connection error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to PostgreSQL database. Please check PostgreSQL password in backend/.env or start PostgreSQL service."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal login error: {str(e)}"
        )

@router.post("/google", response_model=Token, summary="Google OAuth Authentication & Registration")
def google_oauth_login(payload: GoogleOAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticates or Registers user via Google OAuth 2.0.
    1. Verifies Google ID Token (or accepts credential payload).
    2. Saves/Updates user in PostgreSQL with provider='GOOGLE'.
    3. Returns JWT token and User response object.
    """
    email = None
    name = None

    # Verify Google ID Token if token provided
    if payload.token:
        if HAS_GOOGLE_AUTH and "demo" not in settings.GOOGLE_CLIENT_ID:
            try:
                id_info = id_token.verify_oauth2_token(
                    payload.token, 
                    google_requests.Request(), 
                    settings.GOOGLE_CLIENT_ID
                )
                email = id_info.get("email")
                name = id_info.get("name") or email.split("@")[0]
            except Exception as ve:
                logger.warning(f"Google ID Token verification fallback: {ve}")

    # Fallback to email/name from payload
    if not email and payload.email:
        email = payload.email.lower().strip()
        name = payload.name.strip() if payload.name else email.split("@")[0]

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth authentication failed: Missing valid email or Google token."
        )

    if payload.role and payload.role.upper() == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google OAuth is disabled for Administrator accounts. Please sign in using Administrator database credentials."
        )

    try:
        user = db.query(User).filter(User.email == email.lower()).first()

        if user:
            if user.role.upper() == "ADMIN":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Google OAuth is disabled for Administrator accounts. Please sign in using Administrator database credentials."
                )
            # Existing user - update provider if needed
            if user.provider != "GOOGLE":
                user.provider = "GOOGLE"
                db.commit()
                db.refresh(user)
        else:
            # Register new user from Google OAuth
            random_password = secrets.token_urlsafe(16)
            hashed_pwd = hash_password(random_password)

            user = User(
                name=name or "Google User",
                email=email.lower(),
                password=hashed_pwd,
                role=payload.role.strip() if payload.role else "USER",
                provider="GOOGLE"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Registered new Google OAuth user in PostgreSQL: {email}")

        access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    except OperationalError as e:
        logger.error(f"PostgreSQL connection error during Google OAuth: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error during Google OAuth."
        )

@router.get("/users", response_model=List[UserResponse], summary="List all registered users")
def get_all_users(db: Session = Depends(get_db)):
    """
    Fetch list of registered users from PostgreSQL database.
    """
    try:
        users = db.query(User).all()
        return users
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to PostgreSQL database."
        )

@router.delete("/users/{email}", summary="Delete user by email")
def delete_user_by_email(email: str, db: Session = Depends(get_db)):
    """
    Deletes a user account from PostgreSQL database by email.
    """
    try:
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"User with email '{email}' not found."
            )
        
        db.delete(user)
        db.commit()
        return {"status": "success", "message": f"User '{email}' deleted successfully from database."}
    except OperationalError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Database connection error during user deletion."
        )
