import os
import faiss
import numpy as np
from app.utils.logging import app_logger
from typing import List, Tuple, Optional

DIMENSION = 384
INDEX_FILE = "/home/aashrith/Dev/HireMind-AI/data/embeddings/faiss.index"

# Singleton FAISS index in memory
_faiss_index = None

def build_faiss_index(embeddings: np.ndarray) -> faiss.Index:
    """Builds a FAISS index from the provided numpy array of embeddings and saves it."""
    global _faiss_index
    if len(embeddings) == 0:
        app_logger.warning("Empty embeddings provided. Building an empty IndexFlatIP index.")
        _faiss_index = faiss.IndexFlatIP(DIMENSION)
        return _faiss_index
    
    # Ensure float32 format
    embeddings_f32 = embeddings.astype('float32')
    
    # Normalize vectors for cosine similarity (Inner Product metric)
    faiss.normalize_L2(embeddings_f32)
    
    try:
        app_logger.info("Attempting to build IndexHNSWFlat index...")
        # 32 connections per node, using Inner Product metric
        index = faiss.IndexHNSWFlat(DIMENSION, 32, faiss.METRIC_INNER_PRODUCT)
        index.add(embeddings_f32)
        _faiss_index = index
        app_logger.info("IndexHNSWFlat index built successfully.")
    except Exception as e:
        app_logger.warning(f"HNSW indexing failed: {str(e)}. Falling back to IndexFlatIP.")
        index = faiss.IndexFlatIP(DIMENSION)
        index.add(embeddings_f32)
        _faiss_index = index
        app_logger.info("IndexFlatIP index built successfully.")
        
    # Write to disk
    try:
        os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
        faiss.write_index(_faiss_index, INDEX_FILE)
        app_logger.info(f"Saved FAISS index to {INDEX_FILE} successfully.")
    except Exception as e:
        app_logger.error(f"Error saving FAISS index to disk: {str(e)}")
        
    return _faiss_index

def load_faiss_index() -> Optional[faiss.Index]:
    """Loads the FAISS index from disk or rebuilds it if missing."""
    global _faiss_index
    if _faiss_index is not None:
        return _faiss_index
        
    if os.path.exists(INDEX_FILE):
        try:
            _faiss_index = faiss.read_index(INDEX_FILE)
            app_logger.info(f"Loaded FAISS index from {INDEX_FILE} successfully.")
            return _faiss_index
        except Exception as e:
            app_logger.error(f"Error reading FAISS index from disk: {str(e)}")
            
    # Try to rebuild if index is missing but embeddings exist
    from app.services.embedding_service import load_cached_embeddings
    embeddings, _ = load_cached_embeddings()
    if embeddings is not None and len(embeddings) > 0:
        app_logger.info("Index file missing, but embeddings cache exists. Rebuilding FAISS index...")
        return build_faiss_index(embeddings)
        
    app_logger.warning("No FAISS index or candidate embeddings cache found on disk.")
    return None

def retrieve_candidates(query_embedding: np.ndarray, k: int = 2000) -> List[Tuple[str, float]]:
    """
    Performs cosine similarity search using the FAISS index.
    Returns list of tuples (candidate_id, similarity_score).
    """
    index = load_faiss_index()
    if index is None:
        app_logger.warning("Retrieval failed: FAISS index is not initialized.")
        return []
        
    # Prepare query vector
    query_vector = query_embedding.copy().reshape(1, -1).astype('float32')
    faiss.normalize_L2(query_vector)
    
    total_indexed = index.ntotal
    actual_k = min(k, total_indexed)
    if actual_k <= 0:
        app_logger.warning("FAISS index is empty.")
        return []
        
    # Perform retrieval search
    distances, indices = index.search(query_vector, actual_k)
    
    # Retrieve mapping IDs
    from app.services.embedding_service import load_cached_embeddings
    _, candidate_ids = load_cached_embeddings()
    
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx >= 0 and idx < len(candidate_ids):
            results.append((candidate_ids[idx], float(dist)))
            
    return results

def reset_faiss_index_singleton():
    """Forces reloading the FAISS index on next search."""
    global _faiss_index
    _faiss_index = None
