from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer, Float, or_
from sqlalchemy.dialects.postgresql import insert, JSONB
from app.models.models import Candidate
from typing import List, Dict, Any, Optional

class CandidateRepository:
    @staticmethod
    def get_by_id(db: Session, candidate_id: str) -> Optional[Candidate]:
        return db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 20) -> List[Candidate]:
        return db.query(Candidate).offset(skip).limit(limit).all()

    @staticmethod
    def count_all(db: Session) -> int:
        return db.query(func.count(Candidate.candidate_id)).scalar()

    @staticmethod
    def bulk_upsert(db: Session, items: List[Dict[str, Any]]):
        if not items:
            return
        
        stmt = insert(Candidate).values(items)
        # Upsert: update existing records on conflict of candidate_id
        update_stmt = stmt.on_conflict_do_update(
            index_elements=['candidate_id'],
            set_={
                'profile_json': stmt.excluded.profile_json,
                'career_json': stmt.excluded.career_json,
                'skills_json': stmt.excluded.skills_json,
                'education_json': stmt.excluded.education_json,
                'signals_json': stmt.excluded.signals_json,
                'created_at': stmt.excluded.created_at
            }
        )
        db.execute(update_stmt)

    @staticmethod
    def search_and_filter(
        db: Session,
        query: Optional[str] = None,
        skills: Optional[List[str]] = None,
        location: Optional[str] = None,
        role: Optional[str] = None,
        experience_min: Optional[float] = None,
        experience_max: Optional[float] = None,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Candidate], int]:
        db_query = db.query(Candidate)

        # Full Text Search on Name, Title, Location, Summary
        if query:
            # Create tsquery
            tsquery = func.plainto_tsquery('english', query)
            # Create tsvector matching against the GIN index structure
            tsvector = func.to_tsvector(
                "english",
                func.coalesce(func.jsonb_extract_path_text(Candidate.profile_json, "name"), "") + " " +
                func.coalesce(func.jsonb_extract_path_text(Candidate.profile_json, "title"), "") + " " +
                func.coalesce(func.jsonb_extract_path_text(Candidate.profile_json, "location"), "") + " " +
                func.coalesce(func.jsonb_extract_path_text(Candidate.profile_json, "summary"), "")
            )
            # Filter
            db_query = db_query.filter(tsvector.op('@@')(tsquery))

        # Skill filtering (using JSONB contains operator)
        if skills:
            for skill in skills:
                # check if skills_json contains the skill string
                db_query = db_query.filter(Candidate.skills_json.contains(cast([skill], JSONB)))

        # Location filtering
        if location:
            db_query = db_query.filter(
                func.jsonb_extract_path_text(Candidate.profile_json, "location").ilike(f"%{location}%")
            )

        # Role / Title filtering
        if role:
            db_query = db_query.filter(
                func.jsonb_extract_path_text(Candidate.profile_json, "title").ilike(f"%{role}%")
            )

        # Experience Filtering (from signals_json)
        if experience_min is not None:
            db_query = db_query.filter(
                cast(func.jsonb_extract_path_text(Candidate.signals_json, "years_of_experience"), Float) >= experience_min
            )
        if experience_max is not None:
            db_query = db_query.filter(
                cast(func.jsonb_extract_path_text(Candidate.signals_json, "years_of_experience"), Float) <= experience_max
            )

        # Count total matched
        total = db_query.count()

        # Paginate results
        results = db_query.offset(skip).limit(limit).all()
        return results, total
