import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config.config import settings
from app.database.database import engine, Base
from app.routers import health, candidates, jobs, dashboard, tasks, dataset
from app.utils.logging import app_logger

# Run DB migrations/initialization on startup (for simplicity in Phase 1 setup)
try:
    app_logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    app_logger.info("Database tables initialized successfully.")
except Exception as e:
    app_logger.error(f"Error initializing database tables: {str(e)}")

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for candidate ranking and discovery.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    duration = time.time() - start_time
    app_logger.info(
        f"Method: {request.method} | "
        f"Path: {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Duration: {duration:.3f}s"
    )
    return response

# Register API routes
app.include_router(health.router)
app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(dashboard.router)
app.include_router(tasks.router)
app.include_router(dataset.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the HireMind AI API API"}
