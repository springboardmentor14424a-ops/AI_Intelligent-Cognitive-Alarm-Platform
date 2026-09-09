import os
import secrets
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

SELF_SERVICE_ROLES = {"user", "wellness_coach"}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

oauth_state_serializer = URLSafeTimedSerializer(
    auth.SECRET_KEY,
    salt="google-oauth",
)


@router.get("/google")
def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials are not configured",
        )

    redirect_uri = str(request.url_for("google_callback"))

    state = oauth_state_serializer.dumps({
        "nonce": secrets.token_urlsafe(16)
    })

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }

    google_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=google_url)


@router.get("/google/callback", name="google_callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    error = request.query_params.get("error")
    if error:
        return HTMLResponse(
            f"""
            <html>
            <body>
            <script>
                window.opener.postMessage(
                    {{ type: "google-auth-error", error: {error!r} }},
                    window.location.origin
                );
                window.close();
            </script>
            </body>
            </html>
            """
        )

    code = request.query_params.get("code")
    state = request.query_params.get("state")

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Missing Google authorization code or state",
        )

    try:
        oauth_state_serializer.loads(state, max_age=600)
    except SignatureExpired:
        raise HTTPException(
            status_code=400,
            detail="Google login session expired. Please try again.",
        )
    except BadSignature:
        raise HTTPException(
            status_code=400,
            detail="Invalid Google OAuth state.",
        )

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials are not configured",
        )

    redirect_uri = str(request.url_for("google_callback"))

    token_data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data=token_data,
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to exchange Google authorization code",
            )

        token_json = token_response.json()
        google_access_token = token_json.get("access_token")

        if not google_access_token:
            raise HTTPException(
                status_code=400,
                detail="Google did not return an access token",
            )

        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={
                "Authorization": f"Bearer {google_access_token}"
            },
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to retrieve Google user information",
            )

        google_user = userinfo_response.json()

    email = google_user.get("email")
    name = google_user.get("name") or email.split("@")[0] if email else None
    email_verified = google_user.get("email_verified", False)

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google account did not provide an email address",
        )

    if not email_verified:
        raise HTTPException(
            status_code=400,
            detail="Google email address is not verified",
        )

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user:
        user = models.User(
            name=name,
            email=email,
            hashed_password=auth.hash_password(
                secrets.token_urlsafe(32)
            ),
            role="user",
            is_demo=False,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    token = auth.create_access_token({
        "sub": str(user.id)
    })

    return HTMLResponse(
        f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Google Sign-In</title>
        </head>
        <body>
            <script>
                window.opener.postMessage(
                    {{
                        type: "google-auth-success",
                        token: {token!r}
                    }},
                    window.location.origin
                );
                window.close();
            </script>

            <p>Google login successful. You can close this window.</p>
        </body>
        </html>
        """
    )


@router.post("/register", response_model=schemas.Token)
def register(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    role = (
        payload.role
        if payload.role in SELF_SERVICE_ROLES
        else "user"
    )

    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({
        "sub": str(user.id)
    })

    return schemas.Token(
        access_token=token,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/demo-login", response_model=schemas.Token)
def demo_login(
    payload: schemas.DemoLoginRequest,
    db: Session = Depends(get_db),
):
    role_map = {
        "admin": "demo.admin@cognitivealarm.dev",
        "wellness_coach": "demo.coach@cognitivealarm.dev",
        "user": "demo.user@cognitivealarm.dev",
    }

    email = role_map.get(payload.role)

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Unknown demo role",
        )

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Demo account not seeded yet — restart the server",
        )

    token = auth.create_access_token({
        "sub": str(user.id)
    })

    return schemas.Token(
        access_token=token,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.Token)
def login(
    payload: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    if not user or not auth.verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    token = auth.create_access_token({
        "sub": str(user.id)
    })

    return schemas.Token(
        access_token=token,
        user=schemas.UserOut.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserOut)
def me(
    current_user: models.User = Depends(auth.get_current_user),
):
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