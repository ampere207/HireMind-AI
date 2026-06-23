from sqlalchemy.orm import Session
from app.models.models import JobDescription, RankingRun
from typing import List, Optional, Dict, Any

class JobRepository:
    @staticmethod
    def create(db: Session, title: str, description: str, metadata: Optional[Dict[str, Any]] = None) -> JobDescription:
        db_job = JobDescription(
            title=title,
            description=description,
            metadata_json=metadata
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        return db_job

    @staticmethod
    def get_by_id(db: Session, job_id: int) -> Optional[JobDescription]:
        return db.query(JobDescription).filter(JobDescription.id == job_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[JobDescription]:
        return db.query(JobDescription).order_by(JobDescription.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def delete(db: Session, job_id: int) -> bool:
        db_job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
        if db_job:
            db.delete(db_job)
            db.commit()
            return True
        return False

    @staticmethod
    def create_run(db: Session, job_id: int) -> RankingRun:
        db_run = RankingRun(job_id=job_id, status="PENDING")
        db.add(db_run)
        db.commit()
        db.refresh(db_run)
        return db_run

    @staticmethod
    def get_run_by_id(db: Session, run_id: int) -> Optional[RankingRun]:
        return db.query(RankingRun).filter(RankingRun.id == run_id).first()

    @staticmethod
    def get_runs(db: Session, skip: int = 0, limit: int = 100) -> List[RankingRun]:
        return db.query(RankingRun).order_by(RankingRun.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_runs(db: Session) -> int:
        return db.query(RankingRun).count()
