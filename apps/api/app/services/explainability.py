from typing import Dict, Any, List, Union
from app.models.models import Candidate
from app.services.features import CandidateFeatures
from app.services.jd_parser import ParsedJobDescription
from pydantic import BaseModel

class ExplanationResult(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    reasoning: str
    confidence: str # High, Medium, Low
    confidence_score: float

def generate_explanation(
    candidate: Union[Candidate, Dict[str, Any]],
    features: CandidateFeatures,
    parsed_jd: ParsedJobDescription,
    final_score: float
) -> ExplanationResult:
    """
    Generates structured match explanations (strengths, weaknesses, reasoning, confidence)
    based on the candidate features and job description.
    """
    profile = features = features # Keep reference
    profile_json = candidate.profile_json if hasattr(candidate, "profile_json") else candidate.get("profile", {})
    title = profile_json.get("title", "Software Engineer")
    skills = candidate.skills_json if hasattr(candidate, "skills_json") else candidate.get("skills", [])
    signals = candidate.signals_json if hasattr(candidate, "signals_json") else candidate.get("signals", {})
    years_exp = signals.get("years_of_experience", 0.0)

    strengths = []
    weaknesses = []

    # 1. Evaluate Skills
    candidate_skills_lower = [str(s).lower().strip() for s in skills if s]
    required_matched = []
    required_missing = []
    
    for rs in parsed_jd.required_skills:
        rs_clean = rs.lower().strip()
        if any(rs_clean in cs or cs in rs_clean for cs in candidate_skills_lower):
            required_matched.append(rs)
        else:
            required_missing.append(rs)
            
    preferred_matched = []
    for ps in parsed_jd.preferred_skills:
        ps_clean = ps.lower().strip()
        if any(ps_clean in cs or cs in ps_clean for cs in candidate_skills_lower):
            preferred_matched.append(ps)

    if required_matched:
        strengths.append(f"Matches required skills: {', '.join(required_matched[:4])}")
    if preferred_matched:
        strengths.append(f"Offers preferred skills: {', '.join(preferred_matched[:3])}")
        
    if required_missing:
        weaknesses.append(f"Lacks key required skills: {', '.join(required_missing[:4])}")

    # 2. Evaluate Experience
    min_exp, max_exp = parsed_jd.experience_range
    if years_exp >= min_exp:
        strengths.append(f"Meets tenure parameters with {years_exp:.1f} years of relevant experience.")
    else:
        weaknesses.append(f"Has {years_exp:.1f} years experience, which is below the target minimum of {min_exp} years.")

    # 3. Evaluate Production Focus
    if features.production_score >= 0.6:
        strengths.append("Demonstrates hands-on experience building systems for production and scale.")
    elif features.production_score < 0.3:
        weaknesses.append("Limited visible exposure to high-scale production systems or deployment pipelines.")

    # 4. Evaluate Retrieval Expertise
    if features.retrieval_score >= 0.5:
        strengths.append("Possesses expertise in search, retrieval, and vector databases.")

    # 5. Evaluate Stability
    if features.stability_score <= 0.5:
        weaknesses.append("Frequent job hops; average role duration is under 1.2 years.")

    # 6. Evaluate Behavioral & Notice Period
    notice_period = signals.get("notice_period")
    if notice_period and any(str(notice_period) in s for s in ["60", "90"]):
        weaknesses.append(f"Long notice period ({notice_period} days) could delay onboarding.")
        
    if features.behavioral_score >= 0.7:
        strengths.append("High recruitment engagement metrics with active saves and profile views.")

    # 7. Evaluate Fraud Risk
    if features.fraud_score >= 0.4:
        weaknesses.append("High fraud indicator check: contradictions or timeline overlaps detected in career history.")

    # 8. Generate reasoning text
    # Combine first strength and first weakness into a concise sentence
    strength_phrase = strengths[0] if strengths else f"Has {years_exp:.1f} years experience as {title}"
    
    if weaknesses:
        weakness_phrase = f"Minor concern: {weaknesses[0].lower()}"
        reasoning = f"{strength_phrase}. {weakness_phrase}"
    else:
        reasoning = f"{strength_phrase}. Solid candidate match across all signals with zero risk indicators."

    # 9. Confidence
    if final_score >= 0.8:
        confidence = "High"
    elif final_score >= 0.55:
        confidence = "Medium"
    else:
        confidence = "Low"

    return ExplanationResult(
        strengths=strengths,
        weaknesses=weaknesses,
        reasoning=reasoning,
        confidence=confidence,
        confidence_score=float(final_score)
    )
