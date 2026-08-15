import os
import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from config import settings
from database import engine, Base
from routes import auth, alarms, challenges, analytics
from scheduler import alarm_scheduler_loop

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="Unified FastAPI Backend, Database & Frontend Server.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Authentication Router
app.include_router(auth.router)
# Include Alarms Router
app.include_router(alarms.router)
# Include Challenges Router
app.include_router(challenges.router)
# Include Analytics Router
app.include_router(analytics.router)

@app.on_event("startup")
async def startup_event():
    """
    Creates tables in Database and starts background scheduler service on application startup.
    """
    try:
        logger.info("Initializing Database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Warning during DB table initialization: {e}")

    # Launch the background alarm scheduler loop
    asyncio.create_task(alarm_scheduler_loop())


@app.get("/api/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

# Mount static frontend directory if present
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_root = os.path.join(project_root, "frontend")
assets_root = os.path.join(project_root, "assets")

# Serve static frontend pages from the frontend folder.
# Mounting at root handles all non-/api routes automatically.
if os.path.exists(assets_root):
    app.mount("/assets", StaticFiles(directory=assets_root), name="assets")

if os.path.exists(frontend_root):
    app.mount("/", StaticFiles(directory=frontend_root, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
