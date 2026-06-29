from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime

# Candidate sub-schemas
class ProfileSchema(BaseModel):
    name: str
    title: str
    location: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    summary: Optional[str] = None

class CareerItemSchema(BaseModel):
    company: str
    role: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None

class EducationItemSchema(BaseModel):
    institution: str
    degree: str
    grad_year: int

class SignalsSchema(BaseModel):
    loyalty_score: float = Field(..., ge=0.0, le=1.0)
    promotion_speed: str
    years_of_experience: float
    recent_role_duration: float

class CandidateCreate(BaseModel):
    candidate_id: str
    profile: ProfileSchema
    career: List[CareerItemSchema]
    skills: List[str]
    education: List[EducationItemSchema]
    signals: SignalsSchema

class CandidateResponse(BaseModel):
    candidate_id: str
    profile_json: Dict[str, Any]
    career_json: List[Dict[str, Any]]
    skills_json: List[str]
    education_json: List[Dict[str, Any]]
    signals_json: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# User schemas
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Job schemas
class JobDescriptionCreate(BaseModel):
    title: str
    description: str
    metadata: Optional[Dict[str, Any]] = None

class JobDescriptionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    metadata: Optional[Dict[str, Any]] = Field(None, alias="metadata_json")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Ranking Run schemas
class RankingRunResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: str
    results_json: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Background Task schemas
class BackgroundTaskResponse(BaseModel):
    id: str
    task_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Stats and Dashboard schemas
class DashboardStatsResponse(BaseModel):
    total_candidates: int
    uploaded_jobs: int
    rankings_generated: int
    system_status: str

class DatasetStatsResponse(BaseModel):
    candidate_count: int
    skill_distribution: Dict[str, int]
    experience_distribution: Dict[str, int]
