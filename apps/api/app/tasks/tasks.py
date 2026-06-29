import os
import json
from celery import shared_task
from app.core.celery_app import celery_app
from app.database.database import SessionLocal
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.task_repository import TaskRepository
from app.utils.logging import app_logger
from app.models.models import Candidate
from sqlalchemy import func, cast, Float, case
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
                case(
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

@celery_app.task(bind=True)
def build_candidate_embeddings_task(self):
    task_id = self.request.id
    app_logger.info(f"Starting build candidate embeddings task {task_id}")
    
    db = SessionLocal()
    TaskRepository.create_task(db, task_id, "build_candidate_embeddings_task")
    TaskRepository.update_task_status(db, task_id, "RUNNING")
    
    try:
        from app.services.embedding_service import update_embeddings_cache
        from app.services.retrieval import build_faiss_index
        from app.models.models import Candidate
        
        # Fetch all candidates
        db_candidates = db.query(Candidate).all()
        app_logger.info(f"Loaded {len(db_candidates)} candidates from DB for embedding generation.")
        
        # Build embeddings cache
        embeddings, candidate_ids = update_embeddings_cache(db_candidates)
        
        # Build FAISS index
        build_faiss_index(embeddings)
        
        TaskRepository.update_task_status(db, task_id, "SUCCESS")
        db.close()
        return {"status": "success", "total_encoded": len(candidate_ids)}
    except Exception as e:
        app_logger.exception(f"Error in build_candidate_embeddings_task: {str(e)}")
        TaskRepository.update_task_status(db, task_id, "FAILURE")
        db.close()
        raise e

@celery_app.task(bind=True)
def run_ranking_pipeline_task(self, run_id: int, weights: dict = None):
    task_id = self.request.id
    app_logger.info(f"Starting ranking pipeline task {task_id} for run {run_id}")
    
    db = SessionLocal()
    TaskRepository.create_task(db, task_id, "run_ranking_pipeline_task")
    TaskRepository.update_task_status(db, task_id, "RUNNING")
    
    from app.models.models import RankingRun, JobDescription, Candidate
    
    run = db.query(RankingRun).filter(RankingRun.id == run_id).first()
    if not run:
        error_msg = f"RankingRun {run_id} not found."
        app_logger.error(error_msg)
        TaskRepository.update_task_status(db, task_id, "FAILURE")
        db.close()
        return {"status": "error", "message": error_msg}
        
    try:
        # Step 1: JD Parsing
        run.status = "PARSING_JD"
        db.commit()
        
        job = db.query(JobDescription).filter(JobDescription.id == run.job_id).first()
        if not job:
            raise ValueError(f"JobDescription {run.job_id} not found for run {run_id}")
            
        from app.services.jd_parser import parse_job_description
        parsed_jd = parse_job_description(job.description)
        app_logger.info(f"Parsed Job Description successfully. Required skills: {parsed_jd.required_skills}")
        
        # Check FAISS index availability
        from app.services.retrieval import load_faiss_index, build_faiss_index
        index = load_faiss_index()
        if index is None:
            app_logger.info("FAISS index not found. Building embeddings and index first...")
            from app.services.embedding_service import update_embeddings_cache
            db_candidates = db.query(Candidate).all()
            embeddings, _ = update_embeddings_cache(db_candidates)
            build_faiss_index(embeddings)
            
        # Step 2: Retrieving Top 2000
        run.status = "RETRIEVING"
        db.commit()
        
        from app.services.embedding_service import generate_embeddings
        jd_embedding = generate_embeddings([job.description])[0]
        
        from app.services.retrieval import retrieve_candidates
        retrieved = retrieve_candidates(jd_embedding, k=2000)
        retrieved_ids = [r[0] for r in retrieved]
        retrieved_scores = {r[0]: r[1] for r in retrieved}
        app_logger.info(f"Retrieved {len(retrieved_ids)} candidates from FAISS index.")
        
        if not retrieved_ids:
            run.status = "COMPLETED"
            run.results_json = []
            db.commit()
            TaskRepository.update_task_status(db, task_id, "SUCCESS")
            db.close()
            return {"status": "success", "count": 0}
            
        # Step 3: Feature Engineering
        run.status = "ENGINEERING_FEATURES"
        db.commit()
        
        # Load candidate records
        db_candidates = db.query(Candidate).filter(Candidate.candidate_id.in_(retrieved_ids)).all()
        cand_map = {c.candidate_id: c for c in db_candidates}
        ordered_candidates = [cand_map[cid] for cid in retrieved_ids if cid in cand_map]
        
        # Initial score calculation
        from app.services.ranking import rank_candidates_rules
        scored_candidates = rank_candidates_rules(
            db_candidates=ordered_candidates,
            parsed_jd=parsed_jd,
            retrieved_scores=retrieved_scores,
            weights=weights
        )
        
        # Step 4: Cross-Encoder Re-Ranking on top 500
        run.status = "RERANKING"
        db.commit()
        
        top_500 = scored_candidates[:500]
        from app.services.reranker import rerank_candidates
        reranked_candidates = rerank_candidates(job.description, top_500)
        
        # Step 5: Explainability on top 100
        run.status = "EXPLAINING"
        db.commit()
        
        from app.services.explainability import generate_explanation
        shortlist = []
        
        for rank, (cand, feats, final_score) in enumerate(reranked_candidates[:100], start=1):
            exp = generate_explanation(cand, feats, parsed_jd, final_score)
            profile_json = cand.profile_json
            signals_json = cand.signals_json
            
            item = {
                "rank": rank,
                "candidate_id": cand.candidate_id,
                "name": profile_json.get("name", "Unknown"),
                "title": profile_json.get("title", "Software Engineer"),
                "location": profile_json.get("location", ""),
                "score": f"{int(final_score * 100)}%",
                "score_val": final_score,
                "skills": cand.skills_json,
                "fraud_score": feats.fraud_score,
                "explanation": exp.reasoning,
                "strengths": exp.strengths,
                "weaknesses": exp.weaknesses,
                "confidence": exp.confidence,
                "signals": {
                    "loyalty_score": signals_json.get("loyalty_score", 0.5),
                    "promotion_speed": signals_json.get("promotion_speed", "medium"),
                    "years_of_experience": signals_json.get("years_of_experience", 0.0),
                    "recent_role_duration": signals_json.get("recent_role_duration", 0.0),
                    "open_to_work": feats.behavioral_score > 0.5,
                    "notice_period": signals_json.get("notice_period", "30 days")
                },
                "features": feats.model_dump()
            }
            shortlist.append(item)
            
        # Complete
        run.status = "COMPLETED"
        run.results_json = shortlist
        db.commit()
        
        TaskRepository.update_task_status(db, task_id, "SUCCESS")
        db.close()
        return {"status": "success", "count": len(shortlist)}
        
    except Exception as e:
        db.rollback()
        app_logger.exception(f"Error during ranking pipeline run {run_id}: {str(e)}")
        run.status = "FAILED"
        run.error_message = str(e)
        db.commit()
        TaskRepository.update_task_status(db, task_id, "FAILURE")
        db.close()
        raise e
