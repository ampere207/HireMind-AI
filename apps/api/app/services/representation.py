from typing import Any, Dict, Union
from app.models.models import Candidate

def get_json_field(obj: Union[Candidate, Dict[str, Any]], field_name: str) -> Any:
    """Helper to extract a JSON field whether the object is an SQLAlchemy model or dict."""
    if isinstance(obj, Candidate):
        val = getattr(obj, field_name, None)
        return val if val is not None else {}
    return obj.get(field_name, {}) if isinstance(obj, dict) else {}

def generate_candidate_representation(candidate: Union[Candidate, Dict[str, Any]]) -> str:
    """
    Constructs a rich text representation of a candidate profile.
    Combines: Headline/Title, Summary, Career History, Skills, and Recruiter/Behavioral Signals.
    """
    profile = get_json_field(candidate, "profile_json") or get_json_field(candidate, "profile")
    career = get_json_field(candidate, "career_json") or get_json_field(candidate, "career")
    skills = get_json_field(candidate, "skills_json") or get_json_field(candidate, "skills")
    signals = get_json_field(candidate, "signals_json") or get_json_field(candidate, "signals")

    parts = []

    # 1. Headline / Summary
    title = profile.get("title", "Software Engineer").strip()
    summary = profile.get("summary", "").strip()
    
    # Years of experience
    years_of_exp = signals.get("years_of_experience", 0.0)
    # Handle int or float format nicely
    if float(years_of_exp).is_integer():
        years_of_exp_str = str(int(years_of_exp))
    else:
        years_of_exp_str = f"{years_of_exp:.1f}"

    headline = f"{title}.\n{years_of_exp_str} years experience."
    parts.append(headline)

    if summary:
        parts.append(summary)

    # 2. Career History
    if career and isinstance(career, list):
        career_parts = []
        for job in career:
            role = job.get("role", "").strip()
            company = job.get("company", "").strip()
            desc = job.get("description", "").strip()
            
            job_headline = f"{role} at {company}."
            if desc:
                # Append description but remove excessive duplicate punctuation/lines if any
                job_desc = f"{job_headline} {desc}"
            else:
                job_desc = job_headline
            
            career_parts.append(job_desc)
        if career_parts:
            parts.append("\n".join(career_parts))

    # 3. Skills
    if skills and isinstance(skills, list):
        skills_str = ", ".join([str(s) for s in skills if s])
        parts.append(f"Skills:\n{skills_str}.")

    # 4. Certifications (if present in profile metadata or fields)
    certifications = profile.get("certifications", []) or profile.get("certs", [])
    if certifications and isinstance(certifications, list):
        certs_str = ", ".join([str(c) for c in certifications if c])
        parts.append(f"Certifications:\n{certs_str}.")

    # 5. Behavioral Signals
    behavioral_parts = []
    
    # Open To Work status
    open_to_work = signals.get("open_to_work", False)
    if open_to_work or str(open_to_work).lower() == "true":
        behavioral_parts.append("Open To Work.")
        
    # Notice Period
    notice_period = signals.get("notice_period")
    if notice_period:
        # e.g. "30 days" or "30 day"
        notice_period_str = str(notice_period)
        if not notice_period_str.lower().endswith("notice"):
            notice_period_str += " notice"
        behavioral_parts.append(notice_period_str.capitalize() + ".")
        
    # Recruiter Response Rate
    response_rate = signals.get("recruiter_response_rate")
    if response_rate is not None:
        try:
            rate_val = float(response_rate)
            # If it's a fraction (e.g. 0.92) convert to percentage
            if rate_val <= 1.0:
                rate_val *= 100
            behavioral_parts.append(f"{int(rate_val)}% recruiter response.")
        except (ValueError, TypeError):
            pass

    if behavioral_parts:
        parts.append("\n".join(behavioral_parts))

    # Join everything with double newlines
    return "\n\n".join(parts)
