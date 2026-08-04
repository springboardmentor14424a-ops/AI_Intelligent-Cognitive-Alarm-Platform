from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.database import Base, engine
from app.routers import auth, users, dashboard
from app.config import JWT_SECRET_KEY, FRONTEND_URL

# Creates the `users` table if it doesn't exist yet. Fine for a Module 1 build;
# swap for Alembic migrations once the schema starts changing often.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Intelligent Cognitive Alarm Platform - Module 1: Auth")

# Required by authlib's OAuth flow to hold temporary state between redirects.
app.add_middleware(SessionMiddleware, secret_key=JWT_SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Intelligent Cognitive Alarm Platform API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
