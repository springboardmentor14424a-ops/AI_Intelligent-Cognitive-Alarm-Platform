"""
Intelligent Cognitive Alarm Platform — API entrypoint.
Run with:  uvicorn app.main:app --reload --port 8000
Then open: http://localhost:8000
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import Base, engine, SessionLocal
from app.routers import auth as auth_router
from app.routers import alarms as alarms_router
from app.routers import challenges as challenges_router
from app.routers import dashboard as dashboard_router
from app.routers import analytics as analytics_router
from app.routers import personalization as personalization_router
from app.routers import admin as admin_router
from app.routers import reports as reports_router
from app.routers import feedback as feedback_router
from app.routers import checkin as checkin_router
from app.seed import seed_demo_accounts

# Create tables on startup (fine for dev; use Alembic migrations for prod)
Base.metadata.create_all(bind=engine)

# Seed the 3 demo accounts (Admin / Wellness Coach / User) used by the
# "Quick Demo Login" buttons on the sign-in screen.
_seed_db = SessionLocal()
try:
    seed_demo_accounts(_seed_db)
finally:
    _seed_db.close()

app = FastAPI(title="Intelligent Cognitive Alarm Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(alarms_router.router)
app.include_router(challenges_router.router)
app.include_router(dashboard_router.router)
app.include_router(analytics_router.router)
app.include_router(personalization_router.router)
app.include_router(admin_router.router)
app.include_router(reports_router.router)
app.include_router(feedback_router.router)
app.include_router(checkin_router.router)

# Serve the frontend (plain HTML/CSS/JS) directly from the backend so the
# whole app runs from a single `uvicorn` command with no separate server.
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/api/health")
def health():
    return {"status": "ok"}
