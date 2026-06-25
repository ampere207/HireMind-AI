from typing import List, Dict, Any, Tuple, Union
from app.models.models import Candidate
from app.services.jd_parser import ParsedJobDescription
from app.services.fraud_detection import detect_fraud
from app.services.features import compute_features, CandidateFeatures
from app.utils.logging import app_logger

DEFAULT_WEIGHTS = {
    "semantic_match": 0.35,
    "production_score": 0.20,
    "retrieval_score": 0.15,
    "behavior_score": 0.10,
    "experience_score": 0.10,
    "availability_score": 0.05,
    "credibility_score": 0.05,
    "fraud_penalty": 0.20
}

def calculate_rules_score(features: CandidateFeatures, weights: Dict[str, float] = None) -> float:
    """Computes the weighted initial score based on candidate features."""
    w = weights if weights else DEFAULT_WEIGHTS
    
    score = (
        w.get("semantic_match", 0.35) * features.semantic_match +
        w.get("production_score", 0.20) * features.production_score +
        w.get("retrieval_score", 0.15) * features.retrieval_score +
        w.get("behavior_score", 0.10) * features.behavioral_score +
        w.get("experience_score", 0.10) * features.experience_match +
        w.get("availability_score", 0.05) * features.availability_score +
        w.get("credibility_score", 0.05) * features.credibility_score -
        w.get("fraud_penalty", 0.20) * features.fraud_score
    )
    
    # Clamp score to [0.0, 1.0]
    return max(0.0, min(1.0, score))

def rank_candidates_rules(
    db_candidates: List[Any],
    parsed_jd: ParsedJobDescription,
    retrieved_scores: Dict[str, float], # map of candidate_id -> semantic_score
    weights: Dict[str, float] = None
) -> List[Tuple[Any, CandidateFeatures, float]]:
    """
    Given candidates and parsed JD:
    1. Computes fraud score and engineering features for each candidate.
    2. Computes the initial rules-based score.
    3. Sorts and returns candidates with their features and rules score.
    """
    scored_candidates = []
    
    for candidate in db_candidates:
        cid = getattr(candidate, "candidate_id", None) or candidate.get("candidate_id", "")
        semantic_score = retrieved_scores.get(cid, 0.0)
        
        # Detect fraud first
        fraud_res = detect_fraud(candidate)
        
        # Engineering features
        feats = compute_features(
            candidate=candidate,
            parsed_jd=parsed_jd,
            semantic_score=semantic_score,
            fraud_score=fraud_res.fraud_score
        )
        
        # Calculate final rules score
        rules_score = calculate_rules_score(feats, weights)
        scored_candidates.append((candidate, feats, rules_score))
        
    # Sort candidates by rules score in descending order
    scored_candidates.sort(key=lambda x: x[2], reverse=True)
    return scored_candidates
