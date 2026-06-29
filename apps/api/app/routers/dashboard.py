from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from redis import Redis
from app.database.database import get_db
from app.schemas.schemas import DashboardStatsResponse
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.core.auth import get_current_user
from app.models.models import User
from app.config.config import settings
from app.utils.logging import app_logger

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Total Candidates count (global pool)
        total_candidates = CandidateRepository.count_all(db)
        
        # 2. Uploaded Jobs count (user-scoped)
        uploaded_jobs = len(JobRepository.get_all(db, user_id=current_user.id, skip=0, limit=1000))
        
        # 3. Rankings Generated count (user-scoped)
        rankings_generated = JobRepository.count_runs(db, user_id=current_user.id)
        
        # 4. System Status Diagnostic
        db_healthy = True
        try:
            db.execute(text("SELECT 1"))
        except Exception as e:
            app_logger.error(f"Dashboard health-check failed for Postgres: {str(e)}")
            db_healthy = False
            
        redis_healthy = True
        try:
            redis_client = Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1.0)
            redis_client.ping()
        except Exception as e:
            app_logger.error(f"Dashboard health-check failed for Redis: {str(e)}")
            redis_healthy = False
            
        if db_healthy and redis_healthy:
            system_status = "Operational"
        elif db_healthy:
            system_status = "Redis Degraded"
        elif redis_healthy:
            system_status = "Database Degraded"
        else:
            system_status = "Critical Failure"
            
        return DashboardStatsResponse(
            total_candidates=total_candidates,
            uploaded_jobs=uploaded_jobs,
            rankings_generated=rankings_generated,
            system_status=system_status
        )
    except Exception as e:
        app_logger.error(f"Error computing dashboard stats: {str(e)}")
        # Graceful fallback response
        return DashboardStatsResponse(
            total_candidates=0,
            uploaded_jobs=0,
            rankings_generated=0,
            system_status="Error"
        )
