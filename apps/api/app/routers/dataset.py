import os
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.schemas import DatasetStatsResponse
from app.tasks.tasks import generate_stats_task
from app.core.auth import get_current_user
from app.models.models import User
from app.utils.logging import app_logger

router = APIRouter(prefix="/dataset", tags=["Dataset"])

@router.get("/stats", response_model=DatasetStatsResponse)
def get_dataset_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Look for the generated stats file
    stats_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "processed",
        "stats.json"
    )
    
    if not os.path.exists(stats_file):
        # Stats file doesn't exist yet, trigger the task asynchronously and return a message or calculate on the fly
        app_logger.warning("Stats file not found, triggering stats generation task...")
        # Trigger stats generation in background
        generate_stats_task.delay()
        
        # Return fallback empty state
        return DatasetStatsResponse(
            candidate_count=0,
            skill_distribution={},
            experience_distribution={}
        )
        
    try:
        with open(stats_file, "r") as f:
            stats = json.load(f)
        return stats
    except Exception as e:
        app_logger.error(f"Error loading stats file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error reading dataset statistics")

@router.post("/stats/rebuild", status_code=202)
def rebuild_dataset_stats(
    current_user: User = Depends(get_current_user)
):
    task = generate_stats_task.delay()
    return {"message": "Rebuilding dataset statistics in background", "task_id": task.id}
