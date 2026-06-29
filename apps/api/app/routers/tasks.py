from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.schemas.schemas import BackgroundTaskResponse
from app.repositories.task_repository import TaskRepository
from app.core.auth import get_current_user
from app.models.models import User
from app.utils.logging import app_logger

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=List[BackgroundTaskResponse])
def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        tasks = TaskRepository.get_all(db, skip=skip, limit=limit)
        return tasks
    except Exception as e:
        app_logger.error(f"Error fetching background tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{task_id}", response_model=BackgroundTaskResponse)
def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = TaskRepository.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
