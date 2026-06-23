import os
import json
from celery import shared_task
from app.core.celery_app import celery_app
from app.database.database import SessionLocal
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.task_repository import TaskRepository
from app.utils.logging import app_logger
from app.models.models import Candidate
from sqlalchemy import func, cast, Float
import datetime

@celery_app.task(bind=True)
def import_candidates_task(self, file_path: str):
    task_id = self.request.id
    app_logger.info(f"Starting candidate import task {task_id} from file: {file_path}")
    
    db = SessionLocal()
    TaskRepository.create_task(db, task_id, "import_candidates_task")
    TaskRepository.update_task_status(db, task_id, "RUNNING")
    
    if not os.path.exists(file_path):
        error_msg = f"Import file not found: {file_path}"
        app_logger.error(error_msg)
        TaskRepository.update_task_status(db, task_id, "FAILURE")
        db.close()
        return {"status": "error", "message": error_msg}
        
    try:
        chunk = []
        chunk_size = 2000 # bulk batch size
        count = 0
        
        # Read file line by line to keep memory low
        with open(file_path, 'r') as f:
            for line in f:
                if not line.strip():
                    continue
                
                raw_data = json.loads(line)
                
                # Fast validation & schema mapping
                candidate_id = raw_data.get("candidate_id")
                profile = raw_data.get("profile", {})
                career = raw_data.get("career", [])
                skills = raw_data.get("skills", [])
                education = raw_data.get("education", [])
                signals = raw_data.get("signals", {})
                
                if not candidate_id or not profile.get("name") or not profile.get("title"):
                    continue # Skip invalid records
                
                candidate_record = {
                    "candidate_id": candidate_id,
                    "profile_json": profile,
                    "career_json": career,
                    "skills_json": skills,
                    "education_json": education,
                    "signals_json": signals,
                    "created_at": datetime.datetime.utcnow()
                }
                
                chunk.append(candidate_record)
                
                if len(chunk) >= chunk_size:
                    CandidateRepository.bulk_upsert(db, chunk)
                    db.commit()
                    count += len(chunk)
                    app_logger.info(f"Ingested {count} candidates so far...")
                    chunk = []
            
            # Upsert remaining
            if chunk:
                CandidateRepository.bulk_upsert(db, chunk)
                db.commit()
                count += len(chunk)
                
        app_logger.info(f"Completed candidate import: {count} candidates ingested successfully.")
        TaskRepository.update_task_status(db, task_id, "SUCCESS")
        
        # Trigger stats generation right after import
        generate_stats_task.delay()
        
        db.close()
        return {"status": "success", "imported_count": count}
        
    except Exception as e:
        db.rollback()
        app_logger.exception(f"Error during candidate import task {task_id}: {str(e)}")
        TaskRepository.update_task_status(db, task_id, "FAILURE")
        db.close()
        raise e

@celery_app.task(bind=True)
def generate_stats_task(self):
    task_id = self.request.id
    app_logger.info(f"Starting stats generation task {task_id}")
    
    db = SessionLocal()
    TaskRepository.create_task(db, task_id, "generate_stats_task")
    TaskRepository.update_task_status(db, task_id, "RUNNING")
    
    try:
        # 1. Total Candidates count
        total_candidates = db.query(func.count(Candidate.candidate_id)).scalar()
        
        # 2. Skill distribution (top 15)
        # SELECT jsonb_array_elements_text(skills_json) as skill, count(*) FROM candidates GROUP BY skill;
        skill_element = func.jsonb_array_elements_text(Candidate.skills_json)
        skill_counts = (
            db.query(skill_element.label("skill"), func.count(Candidate.candidate_id))
            .group_by("skill")
            .order_by(func.count(Candidate.candidate_id).desc())
            .limit(15)
            .all()
        )
        skill_dist = {row[0]: row[1] for row in skill_counts}
        
        # 3. Experience distribution
        # Classify candidates based on years of experience signals
        exp_field = cast(func.jsonb_extract_path_text(Candidate.signals_json, "years_of_experience"), Float)
        exp_counts = (
            db.query(
                func.case(
                    (exp_field <= 2.0, "0-2 years"),
                    (exp_field <= 5.0, "3-5 years"),
                    (exp_field <= 10.0, "6-10 years"),
                    else_="10+ years"
                ).label("bracket"),
                func.count(Candidate.candidate_id)
            )
            .group_by("bracket")
            .all()
        )
        exp_dist = {row[0]: row[1] for row in exp_counts}
        
        stats = {
            "candidate_count": total_candidates,
            "skill_distribution": skill_dist,
            "experience_distribution": exp_dist,
            "updated_at": datetime.datetime.utcnow().isoformat()
        }
        
        # Store stats in shared space (data/processed/stats.json)
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "processed")
        os.makedirs(output_dir, exist_ok=True)
        
        stats_path = os.path.join(output_dir, "stats.json")
        with open(stats_path, "w") as f:
            json.dump(stats, f, indent=2)
            
        app_logger.info("Dataset statistics successfully updated.")
        TaskRepository.update_task_status(db, task_id, "SUCCESS")
        db.close()
        return {"status": "success", "stats": stats}
        
    except Exception as e:
        app_logger.exception(f"Error during stats generation task {task_id}: {str(e)}")
        TaskRepository.update_task_status(db, task_id, "FAILURE")
        db.close()
        raise e
