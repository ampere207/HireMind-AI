import pytest
from app.services.fraud_detection import detect_fraud

def test_fraud_overlapping_jobs():
    # Candidate with two overlapping full time jobs
    candidate = {
        "candidate_id": "test-overlap",
        "profile": {
            "name": "Jane Doe",
            "title": "Software Engineer"
        },
        "career": [
            {
                "company": "Google",
                "role": "Software Engineer",
                "start_date": "2020-01-01",
                "end_date": "2022-01-01"
            },
            {
                "company": "Meta",
                "role": "Backend Engineer",
                "start_date": "2021-06-01",
                "end_date": "2023-01-01" # Overlaps with Google by 6 months!
            }
        ],
        "skills": ["Python"],
        "education": [],
        "signals": {
            "years_of_experience": 3.0
        }
    }
    
    res = detect_fraud(candidate)
    assert res.impossible_timelines is True
    assert res.fraud_score >= 0.3
    assert any("overlap" in r.lower() for r in res.reasons)

def test_fraud_synthetic_name():
    # Name contains numbers
    candidate = {
        "candidate_id": "test-synthetic",
        "profile": {
            "name": "John Smith 948",
            "title": "Data Engineer"
        },
        "career": [],
        "skills": ["SQL"],
        "education": [],
        "signals": {}
    }
    
    res = detect_fraud(candidate)
    assert res.suspicious_profile is True
    assert res.fraud_score >= 0.35
    assert any("numeric" in r.lower() or "synthetic" in r.lower() for r in res.reasons)

def test_fraud_experience_discrepancy():
    # Claiming 15 years experience, but career timeline is 1 year
    candidate = {
        "candidate_id": "test-exp",
        "profile": {
            "name": "Alex Mercer",
            "title": "Junior Developer"
        },
        "career": [
            {
                "company": "Stripe",
                "role": "Intern",
                "start_date": "2023-01-01",
                "end_date": "2024-01-01"
            }
        ],
        "skills": ["Python"],
        "education": [],
        "signals": {
            "years_of_experience": 15.0 # Flag: huge mismatch
        }
    }
    
    res = detect_fraud(candidate)
    assert res.experience_inconsistencies is True
    assert res.fraud_score >= 0.2
