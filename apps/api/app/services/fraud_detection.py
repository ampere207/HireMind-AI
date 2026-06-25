import re
import datetime
from typing import Dict, Any, List, Union
from pydantic import BaseModel
from app.models.models import Candidate

class FraudResult(BaseModel):
    fraud_score: float
    reasons: List[str]
    impossible_timelines: bool
    education_inconsistencies: bool
    experience_inconsistencies: bool
    skill_inflation: bool
    contradictory_summaries: bool
    unrealistic_transitions: bool
    suspicious_profile: bool

def parse_date(date_str: str) -> datetime.date:
    if not date_str:
        return datetime.date.today()
    
    date_str_clean = str(date_str).strip().lower()
    if date_str_clean in ["present", "current", "null", "none"]:
        return datetime.date.today()
        
    try:
        return datetime.datetime.strptime(date_str_clean, "%Y-%m-%d").date()
    except Exception:
        try:
            # Fallback to YYYY-MM
            return datetime.datetime.strptime(date_str_clean, "%Y-%m").date()
        except Exception:
            try:
                # Fallback to YYYY
                year = int(date_str_clean[:4])
                return datetime.date(year, 1, 1)
            except Exception:
                return datetime.date.today()

def get_json_field(obj: Union[Candidate, Dict[str, Any]], field_name: str) -> Any:
    if isinstance(obj, Candidate):
        val = getattr(obj, field_name, None)
        return val if val is not None else {}
    return obj.get(field_name, {}) if isinstance(obj, dict) else {}

def detect_fraud(candidate: Union[Candidate, Dict[str, Any]]) -> FraudResult:
    """
    Analyzes a candidate profile for fraud indicators and honeypot flags.
    Computes a fraud_score between 0.0 and 1.0.
    """
    profile = get_json_field(candidate, "profile_json") or get_json_field(candidate, "profile")
    career = get_json_field(candidate, "career_json") or get_json_field(candidate, "career")
    skills = get_json_field(candidate, "skills_json") or get_json_field(candidate, "skills")
    signals = get_json_field(candidate, "signals_json") or get_json_field(candidate, "signals")
    education = get_json_field(candidate, "education_json") or get_json_field(candidate, "education")

    reasons = []
    impossible_timelines = False
    education_inconsistencies = False
    experience_inconsistencies = False
    skill_inflation = False
    contradictory_summaries = False
    unrealistic_transitions = False
    suspicious_profile = False

    # 1. Impossible Timelines: Overlapping jobs
    # Look for full-time jobs with significant overlapping dates
    if career and len(career) > 1:
        parsed_jobs = []
        for job in career:
            s_date = parse_date(job.get("start_date"))
            e_date = parse_date(job.get("end_date"))
            parsed_jobs.append((s_date, e_date, job.get("role", ""), job.get("company", "")))
            
        # Sort by start date
        parsed_jobs.sort(key=lambda x: x[0])
        
        for i in range(1, len(parsed_jobs)):
            prev_start, prev_end, prev_role, prev_comp = parsed_jobs[i-1]
            curr_start, curr_end, curr_role, curr_comp = parsed_jobs[i]
            
            # Check if there is significant overlap (> 90 days)
            # Avoid flagging overlaps between minor part-time jobs / internships, check role titles
            is_intern = "intern" in prev_role.lower() or "intern" in curr_role.lower()
            if not is_intern and prev_end > curr_start:
                overlap_days = (prev_end - curr_start).days
                if overlap_days > 90:
                    impossible_timelines = True
                    reasons.append(f"Timeline overlap: '{curr_role}' at {curr_comp} starts before '{prev_role}' at {prev_comp} ended ({overlap_days} days overlap)")
                    break

    # 2. Education Inconsistencies
    # Graduation year before started career by too much, or graduation year in the future, or graduating at a very young age
    first_job_year = 9999
    if career:
        for job in career:
            s_date = parse_date(job.get("start_date"))
            first_job_year = min(first_job_year, s_date.year)
            
    if education and isinstance(education, list):
        for edu in education:
            grad_year = edu.get("grad_year")
            if grad_year:
                try:
                    grad_year_int = int(grad_year)
                    # Graduation year is in the future
                    current_year = datetime.datetime.now().year
                    if grad_year_int > current_year + 5:
                        education_inconsistencies = True
                        reasons.append(f"Future graduation year: {grad_year_int}")
                    # Graduation year is before first career start by > 15 years (suggests age anomaly)
                    if first_job_year != 9999 and first_job_year - grad_year_int > 15:
                        education_inconsistencies = True
                        reasons.append(f"Large gap between graduation ({grad_year_int}) and career start ({first_job_year})")
                except (ValueError, TypeError):
                    pass

    # 3. Experience Inconsistencies
    # Declared years of experience vs calculated tenure from jobs
    declared_exp = float(signals.get("years_of_experience", 0.0))
    
    # Calculate tenure
    computed_tenure_days = 0
    if career:
        for job in career:
            s_date = parse_date(job.get("start_date"))
            e_date = parse_date(job.get("end_date"))
            if e_date >= s_date:
                computed_tenure_days += (e_date - s_date).days
    computed_exp = computed_tenure_days / 365.25
    
    if declared_exp > 0 and abs(declared_exp - computed_exp) > 5.0:
        experience_inconsistencies = True
        reasons.append(f"Experience discrepancy: declared {declared_exp} years, but career timeline is {computed_exp:.1f} years")

    # 4. Skill Inflation
    # Junior developer claiming way too many skills
    if declared_exp > 0 and declared_exp < 2.0 and len(skills) > 12:
        skill_inflation = True
        reasons.append(f"Skill inflation: candidate has {len(skills)} skills with only {declared_exp} years of experience")

    # 5. Contradictory Summaries
    title = profile.get("title", "").lower()
    summary = profile.get("summary", "").lower()
    
    senior_keywords = ["senior", "lead", "principal", "staff", "architect", "manager", "director"]
    junior_keywords = ["junior", "intern", "entry-level", "student", "fresh graduate", "beginner"]
    
    is_senior_title = any(kw in title for kw in senior_keywords)
    is_junior_title = any(kw in title for kw in junior_keywords)
    
    is_senior_summary = any(kw in summary for kw in senior_keywords)
    is_junior_summary = any(kw in summary for kw in junior_keywords)
    
    if (is_senior_title and is_junior_summary) or (is_junior_title and is_senior_summary):
        contradictory_summaries = True
        reasons.append("Contradictory bio/summary: title implies senior/junior level but bio summary states opposite")

    # 6. Unrealistic Transitions
    # E.g. Intern/Junior role directly transitioning to Lead/Principal within a short period
    if career and len(career) > 1:
        # Sort jobs by start date
        sorted_jobs = sorted(career, key=lambda x: parse_date(x.get("start_date")))
        for i in range(1, len(sorted_jobs)):
            prev_role = sorted_jobs[i-1].get("role", "").lower()
            curr_role = sorted_jobs[i].get("role", "").lower()
            
            is_prev_junior = any(kw in prev_role for kw in ["intern", "junior", "trainee"])
            is_curr_senior = any(kw in curr_role for kw in ["lead", "principal", "architect", "manager"])
            
            if is_prev_junior and is_curr_senior:
                prev_end = parse_date(sorted_jobs[i-1].get("end_date"))
                curr_start = parse_date(sorted_jobs[i].get("start_date"))
                gap_days = (curr_start - prev_end).days
                if gap_days < 365:
                    unrealistic_transitions = True
                    reasons.append(f"Suspicious promotion speed: transitioned from '{sorted_jobs[i-1].get('role')}' directly to '{sorted_jobs[i].get('role')}' in less than a year")
                    break

    # 7. Suspicious Profiles (honeypot patterns like names with numbers)
    name = profile.get("name", "")
    if re.search(r"\d", name):
        suspicious_profile = True
        reasons.append("Synthetic name indicator: name contains numeric digits")
        
    email = profile.get("email", "")
    if email and "@" not in email:
        suspicious_profile = True
        reasons.append("Invalid profile email address")

    # Compute final fraud score
    score = 0.0
    if impossible_timelines:
        score += 0.3
    if education_inconsistencies:
        score += 0.2
    if experience_inconsistencies:
        score += 0.2
    if skill_inflation:
        score += 0.15
    if contradictory_summaries:
        score += 0.2
    if unrealistic_transitions:
        score += 0.2
    if suspicious_profile:
        score += 0.35

    # Clamp score between 0.0 and 1.0
    fraud_score = min(1.0, score)

    return FraudResult(
        fraud_score=float(fraud_score),
        reasons=reasons,
        impossible_timelines=impossible_timelines,
        education_inconsistencies=education_inconsistencies,
        experience_inconsistencies=experience_inconsistencies,
        skill_inflation=skill_inflation,
        contradictory_summaries=contradictory_summaries,
        unrealistic_transitions=unrealistic_transitions,
        suspicious_profile=suspicious_profile
    )
