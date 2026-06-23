from sqlalchemy.orm import Session
from app.models.models import BackgroundTask
from typing import List, Optional
import datetime

class TaskRepository:
    @staticmethod
    def create_task(db: Session, task_id: str, task_name: str) -> BackgroundTask:
        db_task = BackgroundTask(
            id=task_id,
            task_name=task_name,
            status="PENDING",
            started_at=datetime.datetime.utcnow()
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        return db_task

    @staticmethod
    def update_task_status(db: Session, task_id: str, status: str) -> Optional[BackgroundTask]:
        db_task = db.query(BackgroundTask).filter(BackgroundTask.id == task_id).first()
        if db_task:
            db_task.status = status
            if status in ["SUCCESS", "FAILURE", "REVOKED"]:
                db_task.completed_at = datetime.datetime.utcnow()
            db.commit()
            db.refresh(db_task)
        return db_task

    @staticmethod
    def get_by_id(db: Session, task_id: str) -> Optional[BackgroundTask]:
        return db.query(BackgroundTask).filter(BackgroundTask.id == task_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[BackgroundTask]:
        return db.query(BackgroundTask).order_by(BackgroundTask.started_at.desc()).offset(skip).limit(limit).all()
