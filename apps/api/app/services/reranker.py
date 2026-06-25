import numpy as np
from sentence_transformers import CrossEncoder
from app.utils.logging import app_logger
from app.services.representation import generate_candidate_representation
from app.services.features import CandidateFeatures
from typing import List, Tuple, Any

_reranker_model = None

def get_reranker_model() -> CrossEncoder:
    """Gets or loads the CrossEncoder model singleton."""
    global _reranker_model
    if _reranker_model is None:
        try:
            _reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            app_logger.info("CrossEncoder ('cross-encoder/ms-marco-MiniLM-L-6-v2') loaded successfully.")
        except Exception as e:
            app_logger.error(f"Error loading CrossEncoder: {str(e)}")
            raise e
    return _reranker_model

def rerank_candidates(
    jd_text: str,
    top_candidates_data: List[Tuple[Any, CandidateFeatures, float]] # list of (candidate, features, rule_score)
) -> List[Tuple[Any, CandidateFeatures, float]]:
    """
    Runs ms-marco-MiniLM-L-6-v2 cross encoder over the top candidates.
    Final Score = 0.6 * rule_score + 0.4 * cross_encoder_score.
    Returns sorted list of (candidate, features, final_score).
    """
    if not top_candidates_data:
        return []
        
    model = get_reranker_model()
    
    # 1. Build pairs for the cross encoder
    pairs = []
    for cand, _, _ in top_candidates_data:
        cand_rep = generate_candidate_representation(cand)
        pairs.append((jd_text, cand_rep))
        
    app_logger.info(f"Running Cross-Encoder re-ranking on {len(pairs)} candidates...")
    
    try:
        # Predict logits
        raw_scores = model.predict(pairs, batch_size=32, show_progress_bar=False)
        raw_scores = np.array(raw_scores)
        
        # 2. Normalize raw logits to [0, 1] using min-max scaling
        min_score = raw_scores.min()
        max_score = raw_scores.max()
        if max_score - min_score > 1e-5:
            normalized_scores = (raw_scores - min_score) / (max_score - min_score)
        else:
            normalized_scores = np.ones_like(raw_scores)
    except Exception as e:
        app_logger.error(f"Error during Cross-Encoder prediction: {str(e)}. Falling back to rules scores.")
        normalized_scores = np.zeros(len(top_candidates_data))
        
    # 3. Compute final weighted score
    final_results = []
    for idx, (cand, features, rule_score) in enumerate(top_candidates_data):
        ce_score = float(normalized_scores[idx]) if idx < len(normalized_scores) else 0.0
        
        # Combine formula: 0.6 * rule_score + 0.4 * cross_encoder_score
        final_score = 0.6 * rule_score + 0.4 * ce_score
        
        # Save CE score in features or as metadata if needed
        # We can store the final score as the ranking score
        final_results.append((cand, features, final_score))
        
    # 4. Sort by final score descending
    final_results.sort(key=lambda x: x[2], reverse=True)
    return final_results
