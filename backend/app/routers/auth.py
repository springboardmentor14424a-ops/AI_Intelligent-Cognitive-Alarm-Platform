from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.database import get_db
from app import models, schemas
from app.security import hash_password, verify_password, create_access_token
from app.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    FRONTEND_URL,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---- Google OAuth2 client setup ----
oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def _token_response(user: models.User) -> schemas.Token:
    token = create_access_token(
        {"id": user.id, "email": user.email, "role": user.role.value}
    )
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role,
        provider=models.ProviderEnum.LOCAL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.password or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_response(user)


# ---- Google OAuth2 flow ----
@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo or not userinfo.get("email"):
        raise HTTPException(status_code=400, detail="Google did not return an email")

    email = userinfo["email"]
    name = userinfo.get("name", email.split("@")[0])

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            name=name,
            email=email,
            password=None,
            role=models.RoleEnum.USER,
            provider=models.ProviderEnum.GOOGLE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(
        {"id": user.id, "email": user.email, "role": user.role.value}
    )
    # Hand the JWT back to the frontend via a redirect with the token in the URL.
    # Frontend reads it once, stores it, then strips it from the address bar.
    return RedirectResponse(url=f"{FRONTEND_URL}/oauth-callback?token={jwt_token}")
