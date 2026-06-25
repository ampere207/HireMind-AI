import os
import spacy
from sentence_transformers import SentenceTransformer, CrossEncoder

def main():
    print("=== Phase 2 Pre-caching Models ===")
    
    # 1. Download spaCy model
    print("Downloading spaCy 'en_core_web_sm'...")
    try:
        spacy.cli.download("en_core_web_sm")
        print("spaCy model downloaded successfully.")
    except Exception as e:
        print(f"Error downloading spaCy model: {str(e)}")
        
    # 2. Pre-cache SentenceTransformer model
    print("Pre-caching SentenceTransformer ('all-MiniLM-L6-v2')...")
    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        print("SentenceTransformer cached successfully.")
    except Exception as e:
        print(f"Error caching SentenceTransformer: {str(e)}")
        
    # 3. Pre-cache CrossEncoder model
    print("Pre-caching CrossEncoder ('cross-encoder/ms-marco-MiniLM-L-6-v2')...")
    try:
        model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        print("CrossEncoder cached successfully.")
    except Exception as e:
        print(f"Error caching CrossEncoder: {str(e)}")
        
    print("=== Model Pre-caching Complete ===")

if __name__ == "__main__":
    main()
