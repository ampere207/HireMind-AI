from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.schemas.schemas import CandidateResponse
from app.repositories.candidate_repository import CandidateRepository
from app.tasks.tasks import import_candidates_task
from app.core.auth import get_current_user
from app.models.models import User
from app.utils.logging import app_logger

router = APIRouter(prefix="/candidates", tags=["Candidates"])

def parse_experience_bracket(exp: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    if not exp:
        return None, None
    if exp == "0-2":
        return 0.0, 2.0
    elif exp == "3-5":
        return 3.0, 5.0
    elif exp == "6-10":
        return 6.0, 10.0
    elif exp == "10+":
        return 10.0, 100.0
    return None, None

@router.get("", response_model=List[CandidateResponse])
def get_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        candidates = CandidateRepository.get_all(db, skip=skip, limit=limit)
        return candidates
    except Exception as e:
        app_logger.error(f"Error fetching candidates: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/search")
def search_candidates(
    q: Optional[str] = Query(None, description="Search term for FTS"),
    skills: Optional[List[str]] = Query(None, description="Skills to filter by"),
    location: Optional[str] = Query(None, description="Location filter"),
    role: Optional[str] = Query(None, description="Current role / job title filter"),
    experience: Optional[str] = Query(None, description="Experience bracket: '0-2', '3-5', '6-10', '10+'"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        exp_min, exp_max = parse_experience_bracket(experience)
        candidates, total = CandidateRepository.search_and_filter(
            db=db,
            query=q,
            skills=skills,
            location=location,
            role=role,
            experience_min=exp_min,
            experience_max=exp_max,
            skip=skip,
            limit=limit
        )
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "candidates": [CandidateResponse.model_validate(c) for c in candidates]
        }
    except Exception as e:
        app_logger.error(f"Error searching candidates: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = CandidateRepository.get_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

from pydantic import BaseModel
class IngestionRequest(BaseModel):
    file_path: Optional[str] = "data/raw/candidates.jsonl"

@router.post("/import")
def import_candidates(
    req: IngestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Trigger Celery Task
        task = import_candidates_task.delay(req.file_path)
        app_logger.info(f"Triggered Ingestion task {task.id} for path {req.file_path} by user {current_user.email}")
        return {
            "message": "Candidate ingestion pipeline started in background",
            "task_id": task.id,
            "status": "PENDING"
        }
    except Exception as e:
        app_logger.error(f"Error starting ingestion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start ingestion: {str(e)}")
