from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.schemas.schemas import JobDescriptionCreate, JobDescriptionResponse, RankingRunResponse
from app.repositories.job_repository import JobRepository
from app.core.auth import get_current_user
from app.models.models import User
from app.utils.logging import app_logger

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("", response_model=JobDescriptionResponse, status_code=201)
def create_job(
    job_in: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        job = JobRepository.create(
            db=db,
            title=job_in.title,
            description=job_in.description,
            user_id=current_user.id,
            metadata=job_in.metadata
        )
        app_logger.info(f"Created Job Description ID {job.id} for user {current_user.email}: {job.title}")
        return job
    except Exception as e:
        app_logger.error(f"Error creating job description: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("", response_model=List[JobDescriptionResponse])
def get_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        jobs = JobRepository.get_all(db, user_id=current_user.id, skip=skip, limit=limit)
        return jobs
    except Exception as e:
        app_logger.error(f"Error listing jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{job_id}", response_model=JobDescriptionResponse)
def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobRepository.get_by_id(db, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job description not found")
    return job

@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobRepository.get_by_id(db, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job description not found")
    
    deleted = JobRepository.delete(db, job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job description not found")
    return Response(status_code=204)

@router.post("/{job_id}/rankings", response_model=RankingRunResponse)
def run_job_ranking(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobRepository.get_by_id(db, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job description not found")
    
    run = JobRepository.create_run(db, job_id, user_id=current_user.id)
    
    # Trigger Celery Background Task
    from app.tasks.tasks import run_ranking_pipeline_task
    task = run_ranking_pipeline_task.delay(run.id)
    
    app_logger.info(f"Created and triggered Ranking Run {run.id} for Job ID {job_id} (Celery task: {task.id})")
    return run
