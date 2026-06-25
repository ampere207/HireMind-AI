import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.database.database import get_db
from app.schemas.schemas import RankingRunResponse
from app.repositories.job_repository import JobRepository
from app.repositories.candidate_repository import CandidateRepository
from app.utils.logging import app_logger

router = APIRouter(prefix="/rank", tags=["Ranking Engine"])

class RankRequest(BaseModel):
    title: str
    description: str
    weights: Optional[Dict[str, float]] = None

class RetrieveRequest(BaseModel):
    description: str
    k: Optional[int] = 2000

@router.post("", response_model=RankingRunResponse)
def run_candidate_ranking(
    req: RankRequest,
    sync: bool = Query(False, description="Run synchronously instead of queueing in Celery"),
    db: Session = Depends(get_db)
):
    """
    Creates a new Job Description and triggers candidate ranking.
    Runs asynchronously by default, returning the run ID.
    If sync=true is set, it computes in-thread and returns the completed run details.
    """
    try:
        # 1. Create Job Description
        job = JobRepository.create(
            db=db,
            title=req.title,
            description=req.description,
            metadata=req.weights
        )
        
        # 2. Create Ranking Run
        run = JobRepository.create_run(db, job.id)
        
        from app.tasks.tasks import run_ranking_pipeline_task
        if sync:
            app_logger.info(f"Running ranking run {run.id} synchronously...")
            # Run task synchronously in this thread
            run_ranking_pipeline_task(run.id, req.weights)
            db.refresh(run)
        else:
            # Trigger Celery Task
            task = run_ranking_pipeline_task.delay(run.id, req.weights)
            app_logger.info(f"Triggered Celery ranking task {task.id} for run {run.id}")
            
        return run
    except Exception as e:
        app_logger.error(f"Error starting ranking run: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start ranking run: {str(e)}")

@router.post("/retrieve")
def retrieve_candidates_only(req: RetrieveRequest, db: Session = Depends(get_db)):
    """
    Retrieves the top k candidate matches (max 2000) semantically from FAISS index.
    """
    try:
        from app.services.embedding_service import generate_embeddings
        from app.services.retrieval import retrieve_candidates
        from app.models.models import Candidate
        
        # 1. Generate Query Embedding
        query_emb = generate_embeddings([req.description])[0]
        
        # 2. Retrieve from FAISS
        k_val = min(req.k or 2000, 2000)
        retrieved = retrieve_candidates(query_emb, k=k_val)
        
        # 3. Fetch candidate documents from database
        retrieved_ids = [r[0] for r in retrieved]
        db_candidates = db.query(Candidate).filter(Candidate.candidate_id.in_(retrieved_ids)).all()
        
        cand_map = {c.candidate_id: c for c in db_candidates}
        
        # Structure response preserving FAISS rank order
        output = []
        for rank, (cid, score) in enumerate(retrieved, start=1):
            if cid in cand_map:
                cand = cand_map[cid]
                output.append({
                    "rank": rank,
                    "candidate_id": cid,
                    "name": cand.profile_json.get("name", "Unknown"),
                    "title": cand.profile_json.get("title", "Software Engineer"),
                    "location": cand.profile_json.get("location", ""),
                    "semantic_score": score
                })
        return output
    except Exception as e:
        app_logger.error(f"Error in retrieve endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")

@router.get("", response_model=List[RankingRunResponse])
def list_ranking_runs(
    job_id: Optional[int] = Query(None, description="Filter runs by Job ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List past ranking runs, optionally filtered by Job ID.
    """
    try:
        from app.models.models import RankingRun
        query = db.query(RankingRun)
        if job_id is not None:
            query = query.filter(RankingRun.job_id == job_id)
        runs = query.order_by(RankingRun.created_at.desc()).offset(skip).limit(limit).all()
        return runs
    except Exception as e:
        app_logger.error(f"Error listing ranking runs: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{run_id}", response_model=RankingRunResponse)
def get_ranking_run_details(run_id: int, db: Session = Depends(get_db)):
    """
    Fetches the details and shortlisted results of a ranking run.
    """
    run = JobRepository.get_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Ranking run not found")
    return run

@router.get("/{run_id}/export")
def export_ranking_run_csv(run_id: int, db: Session = Depends(get_db)):
    """
    Exports the Top 100 candidate shortlist in the exact competition CSV format.
    Fields: candidate_id, rank, score, reasoning
    """
    run = JobRepository.get_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Ranking run not found")
        
    if run.status != "COMPLETED":
        raise HTTPException(status_code=400, detail=f"Ranking run status is {run.status}. Results must be COMPLETED to export.")
        
    results = run.results_json if run.results_json else []
    
    # Generate CSV stream in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["candidate_id", "rank", "score", "reasoning"])
    
    # Write rows
    for item in results:
        writer.writerow([
            item.get("candidate_id"),
            item.get("rank"),
            item.get("score"),
            item.get("explanation")
        ])
        
    output.seek(0)
    
    filename = f"shortlist_run_{run_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
