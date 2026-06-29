import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Index, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(String, primary_key=True, index=True)
    profile_json = Column(JSONB, nullable=False)   # name, title, location, email, phone, summary
    career_json = Column(JSONB, nullable=False)    # list of jobs
    skills_json = Column(JSONB, nullable=False)    # list of skills (strings)
    education_json = Column(JSONB, nullable=False) # list of education histories
    signals_json = Column(JSONB, nullable=False)   # recruiter behavioral signals
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Define GIN index for full-text search on candidate name, title, location and summary
    __table_args__ = (
        Index(
            "idx_candidate_search_vector",
            text("to_tsvector('english', coalesce(profile_json->>'name', '') || ' ' || coalesce(profile_json->>'title', '') || ' ' || coalesce(profile_json->>'location', '') || ' ' || coalesce(profile_json->>'summary', ''))"),
            postgresql_using="gin",
        ),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    jobs = relationship("JobDescription", back_populates="user", cascade="all, delete-orphan")
    runs = relationship("RankingRun", back_populates="user", cascade="all, delete-orphan")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    metadata_json = Column(JSONB, name="metadata", nullable=True) # Map db 'metadata' column to 'metadata_json' to avoid python namespace collision
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="jobs")
    runs = relationship("RankingRun", back_populates="job", cascade="all, delete-orphan")


class RankingRun(Base):
    __tablename__ = "ranking_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING", nullable=False) # PENDING, RUNNING, COMPLETED, FAILED
    results_json = Column(JSONB, nullable=True) # Top 100 candidates shortlist
    error_message = Column(Text, nullable=True) # Error messages if failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="runs")
    job = relationship("JobDescription", back_populates="runs")


class BackgroundTask(Base):
    __tablename__ = "background_tasks"

    id = Column(String, primary_key=True, index=True) # Celery task UUID
    task_name = Column(String, nullable=False)
    status = Column(String, default="PENDING", nullable=False) # PENDING, RUNNING, SUCCESS, FAILURE
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
