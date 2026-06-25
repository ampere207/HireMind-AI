import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from app.utils.logging import app_logger
from typing import List, Tuple, Union, Dict, Any

_model = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        try:
            # Loads all-MiniLM-L6-v2 from huggingface cache
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            app_logger.info("SentenceTransformer ('all-MiniLM-L6-v2') loaded successfully.")
        except Exception as e:
            app_logger.error(f"Error loading SentenceTransformer: {str(e)}")
            raise e
    return _model

# Absolute paths within the workspace volume
EMBEDDINGS_DIR = "/home/aashrith/Dev/HireMind-AI/data/embeddings"
EMBEDDINGS_FILE = os.path.join(EMBEDDINGS_DIR, "candidate_embeddings.npy")
IDS_FILE = os.path.join(EMBEDDINGS_DIR, "candidate_ids.json")

def generate_embeddings(texts: List[str]) -> np.ndarray:
    """Generate embeddings for a list of texts using all-MiniLM-L6-v2 model."""
    if not texts:
        return np.empty((0, 384), dtype=np.float32)
    
    model = get_embedding_model()
    # Batch size of 128 to be efficient and memory safe
    embeddings = model.encode(
        texts,
        batch_size=128,
        show_progress_bar=False,
        convert_to_numpy=True
    )
    return embeddings

def load_cached_embeddings() -> Tuple[Union[np.ndarray, None], List[str]]:
    """Loads cached candidate embeddings and their mapping candidate IDs from disk."""
    if os.path.exists(EMBEDDINGS_FILE) and os.path.exists(IDS_FILE):
        try:
            embeddings = np.load(EMBEDDINGS_FILE)
            with open(IDS_FILE, 'r') as f:
                candidate_ids = json.load(f)
            app_logger.info(f"Loaded {len(candidate_ids)} cached candidate embeddings from disk.")
            return embeddings, candidate_ids
        except Exception as e:
            app_logger.error(f"Error loading cached embeddings from disk: {str(e)}")
    return None, []

def save_cached_embeddings(embeddings: np.ndarray, candidate_ids: List[str]) -> bool:
    """Saves candidate embeddings and candidate ID mapping to disk."""
    os.makedirs(EMBEDDINGS_DIR, exist_ok=True)
    try:
        np.save(EMBEDDINGS_FILE, embeddings)
        with open(IDS_FILE, 'w') as f:
            json.dump(candidate_ids, f)
        app_logger.info(f"Successfully cached {len(candidate_ids)} candidate embeddings on disk.")
        return True
    except Exception as e:
        app_logger.error(f"Error saving candidate embeddings cache: {str(e)}")
        return False

def update_embeddings_cache(db_candidates: List[Any]) -> Tuple[np.ndarray, List[str]]:
    """
    Incrementally updates the candidate embeddings cache.
    Reuses existing embeddings for cached candidate IDs and only encodes new/missing ones.
    """
    embeddings, candidate_ids = load_cached_embeddings()
    
    # Map candidate_id to its index in the cached array
    cache_map = {cid: idx for idx, cid in enumerate(candidate_ids)} if candidate_ids else {}
    
    new_embeddings_list = []
    new_ids = []
    
    to_compute_representations = []
    to_compute_ids = []
    
    from app.services.representation import generate_candidate_representation
    
    app_logger.info(f"Checking embedding cache for {len(db_candidates)} database candidates...")
    for cand in db_candidates:
        cid = cand.candidate_id
        if cid in cache_map and embeddings is not None:
            idx = cache_map[cid]
            new_ids.append(cid)
            new_embeddings_list.append(embeddings[idx])
        else:
            rep = generate_candidate_representation(cand)
            to_compute_representations.append(rep)
            to_compute_ids.append(cid)
            
    if to_compute_representations:
        app_logger.info(f"Generating embeddings for {len(to_compute_representations)} missing candidates...")
        computed = generate_embeddings(to_compute_representations)
        for cid, emb in zip(to_compute_ids, computed):
            new_ids.append(cid)
            new_embeddings_list.append(emb)
            
    if new_embeddings_list:
        final_embeddings = np.stack(new_embeddings_list)
        save_cached_embeddings(final_embeddings, new_ids)
        return final_embeddings, new_ids
    else:
        empty_emb = np.empty((0, 384), dtype=np.float32)
        save_cached_embeddings(empty_emb, [])
        return empty_emb, []
