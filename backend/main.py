import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from config import settings
from database import engine, Base
from routes import auth

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

@app.on_event("startup")
def startup_db_client():
    """
    Creates tables in Database on application startup if they do not exist.
    """
    try:
        logger.info("Initializing Database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Warning during DB table initialization: {e}")

@app.get("/api/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

# Mount static frontend directory if present
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@app.get("/", tags=["Frontend"])
def serve_index():
    index_path = os.path.join(project_root, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "online", "app": settings.APP_NAME, "docs": "/docs"}

if os.path.exists(project_root):
    app.mount("/", StaticFiles(directory=project_root, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
