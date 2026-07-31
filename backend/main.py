from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, EmailStr
from database import get_connection
from auth import hash_password, verify_password, create_token
from authlib.integrations.starlette_client import OAuth
import psycopg2.extras
import traceback
import os

app = FastAPI(title="Wellspring API")

# Session middleware — required for Google OAuth
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "changeme"))

# CORS — allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Google OAuth setup ───────────────────────────────────────
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ── Global error handler ─────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_detail = traceback.format_exc()
    print("=== SERVER ERROR ===")
    print(error_detail)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# ── Request models ───────────────────────────────────────────
class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str

class SigninRequest(BaseModel):
    email: EmailStr
    password: str


# ── Sign Up ──────────────────────────────────────────────────
@app.post("/auth/signup")
def signup(data: SignupRequest):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT id FROM users WHERE email = %s", (data.email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(data.password)
    cur.execute(
        """
        INSERT INTO users (full_name, email, password_hash, role, provider)
        VALUES (%s, %s, %s, %s, 'local')
        RETURNING id, full_name, email, role
        """,
        (data.full_name, data.email, hashed, data.role)
    )
    user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user}


# ── Sign In ──────────────────────────────────────────────────
@app.post("/auth/signin")
def signin(data: SigninRequest):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM users WHERE email = %s", (data.email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id":        user["id"],
            "full_name": user["full_name"],
            "email":     user["email"],
            "role":      user["role"]
        }
    }


# ── Google OAuth: redirect to Google ────────────────────────
@app.get("/auth/google")
async def google_login(request: Request):
    redirect_uri = "http://localhost:8000/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


# ── Google OAuth: callback from Google ──────────────────────
@app.get("/auth/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")

    email     = user_info["email"]
    full_name = user_info.get("name", email)

    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Find existing user or create new one
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()

    if not user:
        cur.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role, provider)
            VALUES (%s, %s, NULL, 'user', 'google')
            RETURNING id, full_name, email, role
            """,
            (full_name, email)
        )
        user = cur.fetchone()
        conn.commit()

    cur.close()
    conn.close()

    # Create JWT and redirect to dashboard
    jwt_token = create_token(user["id"], user["role"])
    from urllib.parse import quote
    safe_name = quote(user["full_name"])

    return RedirectResponse(
        url=f"http://127.0.0.1:5500/dashboard.html?token={jwt_token}&name={safe_name}&role={user['role']}"
    )


# ── Health check ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Wellspring API is running"}
