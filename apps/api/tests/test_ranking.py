import pytest
from app.services.features import CandidateFeatures
from app.services.ranking import calculate_rules_score

def test_calculate_rules_score():
    # High quality candidate features
    features = CandidateFeatures(
        candidate_id="perfect-match",
        semantic_match=0.9,
        required_skills_match=1.0,
        preferred_skills_match=0.8,
        skill_proficiency=0.7,
        skill_duration=0.6,
        experience_match=1.0,
        role_relevance=0.8,
        industry_relevance=0.7,
        production_score=0.9,
        retrieval_score=0.8,
        evaluation_score=0.7,
        startup_score=0.8,
        stability_score=1.0,
        behavioral_score=0.9,
        availability_score=0.85,
        credibility_score=0.95,
        fraud_score=0.0
    )
    
    score = calculate_rules_score(features)
    # Check that the calculated score is high and bounded
    assert score > 0.6
    assert score <= 1.0
    
    # Candidate with fraud penalty
    fraud_features = CandidateFeatures(
        candidate_id="fraud-match",
        semantic_match=0.9,
        required_skills_match=1.0,
        preferred_skills_match=0.8,
        skill_proficiency=0.7,
        skill_duration=0.6,
        experience_match=1.0,
        role_relevance=0.8,
        industry_relevance=0.7,
        production_score=0.9,
        retrieval_score=0.8,
        evaluation_score=0.7,
        startup_score=0.8,
        stability_score=1.0,
        behavioral_score=0.9,
        availability_score=0.85,
        credibility_score=0.95,
        fraud_score=1.0 # 100% fraud indicators!
    )
    
    fraud_score = calculate_rules_score(fraud_features)
    # Should be significantly lower due to the 0.2 fraud penalty
    assert fraud_score < score
    assert abs((score - fraud_score) - 0.2) < 1e-4
