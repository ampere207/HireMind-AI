import re
import hashlib
from typing import Dict, Any, List, Union
from pydantic import BaseModel
from app.models.models import Candidate
from app.services.jd_parser import ParsedJobDescription

class CandidateFeatures(BaseModel):
    candidate_id: str
    semantic_match: float
    required_skills_match: float
    preferred_skills_match: float
    skill_proficiency: float
    skill_duration: float
    experience_match: float
    role_relevance: float
    industry_relevance: float
    production_score: float
    retrieval_score: float
    evaluation_score: float
    startup_score: float
    stability_score: float
    behavioral_score: float
    availability_score: float
    credibility_score: float
    fraud_score: float

# Deterministic mock helpers for fields missing from raw dataset
def get_deterministic_float(candidate_id: str, salt: str, min_val: float = 0.0, max_val: float = 1.0) -> float:
    h = hashlib.md5(f"{candidate_id}:{salt}".encode()).hexdigest()
    val = int(h[:8], 16) / 0xffffffff
    return min_val + val * (max_val - min_val)

def get_deterministic_bool(candidate_id: str, salt: str, probability: float = 0.5) -> bool:
    return get_deterministic_float(candidate_id, salt) < probability

def get_deterministic_choice(candidate_id: str, salt: str, choices: List[Any], weights: List[float]) -> Any:
    val = get_deterministic_float(candidate_id, salt)
    cumulative = 0.0
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    
    for choice, weight in zip(choices, normalized_weights):
        cumulative += weight
        if val <= cumulative:
            return choice
    return choices[-1]

def get_json_field(obj: Union[Candidate, Dict[str, Any]], field_name: str) -> Any:
    if isinstance(obj, Candidate):
        val = getattr(obj, field_name, None)
        return val if val is not None else {}
    return obj.get(field_name, {}) if isinstance(obj, dict) else {}

def compute_features(
    candidate: Union[Candidate, Dict[str, Any]],
    parsed_jd: ParsedJobDescription,
    semantic_score: float,
    fraud_score: float
) -> CandidateFeatures:
    """
    Computes all candidate features for the ranking engine.
    """
    profile = get_json_field(candidate, "profile_json") or get_json_field(candidate, "profile")
    career = get_json_field(candidate, "career_json") or get_json_field(candidate, "career")
    skills = get_json_field(candidate, "skills_json") or get_json_field(candidate, "skills")
    signals = get_json_field(candidate, "signals_json") or get_json_field(candidate, "signals")
    
    candidate_id = getattr(candidate, "candidate_id", None) or candidate.get("candidate_id", "")

    # Ensure clean lowercase lists for matching
    candidate_skills_lower = [str(s).lower().strip() for s in skills if s]
    required_skills_lower = [s.lower().strip() for s in parsed_jd.required_skills]
    preferred_skills_lower = [s.lower().strip() for s in parsed_jd.preferred_skills]

    # 1. Required Skills Match
    if not required_skills_lower:
        required_skills_match = 1.0
    else:
        matched_req = sum(1 for rs in required_skills_lower if any(rs in cs or cs in rs for cs in candidate_skills_lower))
        required_skills_match = matched_req / len(required_skills_lower)

    # 2. Preferred Skills Match
    if not preferred_skills_lower:
        preferred_skills_match = 1.0
    else:
        matched_pref = sum(1 for ps in preferred_skills_lower if any(ps in cs or cs in rs for cs in candidate_skills_lower))
        preferred_skills_match = matched_pref / len(preferred_skills_lower)

    # 3. Skill Proficiency (fraction of total taxonomy skills matched)
    skill_proficiency = min(1.0, len(candidate_skills_lower) / 10.0)

    # 4. Skill Duration (from years of experience)
    years_exp = signals.get("years_of_experience", 0.0)
    skill_duration = min(1.0, years_exp / 8.0)

    # 5. Experience Match (min/max range)
    min_exp, max_exp = parsed_jd.experience_range
    if years_exp >= min_exp and years_exp <= max_exp:
        experience_match = 1.0
    elif years_exp < min_exp:
        # Penalize if below min experience
        experience_match = max(0.0, 1.0 - (min_exp - years_exp) / max(1.0, min_exp))
    else:
        # Slightly penalize if overqualified by > 5 years
        overage = years_exp - max_exp
        experience_match = max(0.7, 1.0 - (overage * 0.05))

    # 6. Role Relevance (compare current title to JD preferred traits / title keyword matches)
    current_title = profile.get("title", "").lower()
    role_relevance = 0.5
    if current_title:
        # Check title overlap with required traits / skills
        matches = 0
        for trait in parsed_jd.preferred_traits:
            if trait.lower() in current_title:
                matches += 1
        for skill in parsed_jd.required_skills:
            if skill.lower() in current_title:
                matches += 1
        role_relevance = min(1.0, 0.5 + (matches * 0.15))

    # 7. Industry Relevance (checks if they worked at target companies)
    companies = [job.get("company", "").lower() for job in career if job.get("company")]
    target_industries = ["google", "meta", "netflix", "apple", "amazon", "microsoft", "uber", "salesforce", "airbnb"]
    matches = sum(1 for comp in companies if any(target in comp for target in target_industries))
    industry_relevance = min(1.0, 0.5 + (matches * 0.2))

    # Compile a career text for keyword detection
    career_texts = []
    for job in career:
        career_texts.append(job.get("role", "").lower())
        career_texts.append(job.get("description", "").lower())
    career_full_text = " ".join(career_texts) + " " + profile.get("summary", "").lower()

    # Helper keyword matcher
    def count_keyword_matches(text: str, keywords: List[str]) -> int:
        count = 0
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw.lower())}\b", text):
                count += 1
        return count

    # 8. Production Experience Score
    production_kws = ["deployed", "production", "scale", "users", "pipelines", "latency", "distributed systems", "kubernetes", "docker"]
    prod_matches = count_keyword_matches(career_full_text, production_kws)
    production_score = min(1.0, prod_matches / 3.0)

    # 9. Retrieval Expertise Score
    retrieval_kws = ["embeddings", "search", "retrieval", "ranking", "recommendation", "vector database", "qdrant", "pinecone", "faiss"]
    retrieval_matches = count_keyword_matches(career_full_text, retrieval_kws)
    retrieval_score = min(1.0, retrieval_matches / 2.0)

    # 10. Evaluation Framework Score
    evaluation_kws = ["ndcg", "mrr", "map", "a/b testing", "ab testing", "offline evaluation", "metrics"]
    evaluation_matches = count_keyword_matches(career_full_text, evaluation_kws)
    evaluation_score = min(1.0, evaluation_matches / 2.0)

    # 11. Startup Score
    startup_kws = ["startup", "founding", "small team", "fast growth", "velocity", "ownership"]
    startup_matches = count_keyword_matches(career_full_text, startup_kws)
    # Check if preferred traits contain startup terms
    startup_traits = sum(1 for trait in parsed_jd.preferred_traits if trait.lower() in ["startup", "founding", "growth"])
    startup_score = min(1.0, (startup_matches + startup_traits) / 2.0)

    # 12. Job Stability Score
    # average job duration = years_exp / num_jobs
    num_jobs = len(career)
    if num_jobs > 0:
        avg_tenure = years_exp / num_jobs
        if avg_tenure >= 2.0:
            stability_score = 1.0
        elif avg_tenure >= 1.5:
            stability_score = 0.9
        elif avg_tenure >= 1.0:
            stability_score = 0.7
        else:
            stability_score = 0.4
    else:
        stability_score = 0.8 # Default stable

    # 13. Behavioral Score
    open_to_work = signals.get("open_to_work")
    if open_to_work is None:
        open_to_work = get_deterministic_bool(candidate_id, "open_to_work", 0.3)
    
    response_rate = signals.get("recruiter_response_rate")
    if response_rate is None:
        response_rate = get_deterministic_float(candidate_id, "response_rate", 0.6, 0.98)
    elif response_rate <= 1.0:
         response_rate = response_rate * 1.0
    else:
         response_rate = response_rate / 100.0

    interview_completion = signals.get("interview_completion_rate")
    if interview_completion is None:
        interview_completion = get_deterministic_float(candidate_id, "interview_completion", 0.7, 1.0)
    elif interview_completion > 1.0:
        interview_completion /= 100.0

    github_activity = signals.get("github_activity")
    if github_activity is None:
        github_activity = get_deterministic_float(candidate_id, "github_activity", 0.2, 0.95)

    recent_activity = signals.get("recent_activity")
    if recent_activity is None:
        recent_activity = get_deterministic_float(candidate_id, "recent_activity", 0.3, 0.9)

    profile_views = signals.get("profile_views")
    if profile_views is None:
        profile_views = int(get_deterministic_float(candidate_id, "profile_views", 10, 500))
    norm_views = min(1.0, profile_views / 250.0)

    recruiter_saves = signals.get("recruiter_saves")
    if recruiter_saves is None:
        recruiter_saves = int(get_deterministic_float(candidate_id, "recruiter_saves", 0, 30))
    norm_saves = min(1.0, recruiter_saves / 20.0)

    behavioral_score = (
        0.20 * (1.0 if open_to_work else 0.0) +
        0.20 * response_rate +
        0.15 * interview_completion +
        0.15 * github_activity +
        0.10 * recent_activity +
        0.10 * norm_views +
        0.10 * norm_saves
    )

    # 14. Availability Score
    notice_period = signals.get("notice_period")
    if notice_period is None:
        notice_period = get_deterministic_choice(candidate_id, "notice_period", [0, 30, 60, 90], [0.1, 0.5, 0.25, 0.15])
    
    # map notice period to score
    try:
        notice_days = int(str(notice_period).lower().replace("days", "").replace("day", "").strip())
    except Exception:
        notice_days = 30
        
    if notice_days <= 0:
        notice_score = 1.0 # immediate
    elif notice_days <= 30:
        notice_score = 0.9
    elif notice_days <= 60:
        notice_score = 0.6
    else:
        notice_score = 0.3 # 90 days or more
        
    relocation = signals.get("relocation")
    if relocation is None:
        relocation = get_deterministic_bool(candidate_id, "relocation", 0.4)
    reloc_score = 1.0 if relocation else 0.6

    preferred_mode = signals.get("preferred_work_mode") or signals.get("work_mode")
    if preferred_mode is None:
        preferred_mode = get_deterministic_choice(candidate_id, "work_mode", ["remote", "hybrid", "onsite"], [0.4, 0.4, 0.2])
    
    # default work mode match to hybrid
    mode_score = 1.0 if preferred_mode in ["remote", "hybrid"] else 0.7

    availability_score = 0.4 * notice_score + 0.3 * reloc_score + 0.3 * mode_score

    # 15. Credibility Score
    verified_email = signals.get("verified_email")
    if verified_email is None:
        verified_email = get_deterministic_bool(candidate_id, "verified_email", 0.9)
    email_score = 1.0 if verified_email else 0.0

    verified_phone = signals.get("verified_phone")
    if verified_phone is None:
        verified_phone = get_deterministic_bool(candidate_id, "verified_phone", 0.8)
    phone_score = 1.0 if verified_phone else 0.0

    linkedin_connected = signals.get("linkedin_connected")
    if linkedin_connected is None:
        linkedin_connected = get_deterministic_bool(candidate_id, "linkedin", 0.75)
    linkedin_score = 1.0 if linkedin_connected else 0.0

    profile_completeness = signals.get("profile_completeness")
    if profile_completeness is None:
        profile_completeness = get_deterministic_float(candidate_id, "profile_completeness", 0.75, 1.0)

    credibility_score = 0.25 * email_score + 0.25 * phone_score + 0.25 * linkedin_score + 0.25 * profile_completeness

    return CandidateFeatures(
        candidate_id=candidate_id,
        semantic_match=float(semantic_score),
        required_skills_match=float(required_skills_match),
        preferred_skills_match=float(preferred_skills_match),
        skill_proficiency=float(skill_proficiency),
        skill_duration=float(skill_duration),
        experience_match=float(experience_match),
        role_relevance=float(role_relevance),
        industry_relevance=float(industry_relevance),
        production_score=float(production_score),
        retrieval_score=float(retrieval_score),
        evaluation_score=float(evaluation_score),
        startup_score=float(startup_score),
        stability_score=float(stability_score),
        behavioral_score=float(behavioral_score),
        availability_score=float(availability_score),
        credibility_score=float(credibility_score),
        fraud_score=float(fraud_score)
    )
