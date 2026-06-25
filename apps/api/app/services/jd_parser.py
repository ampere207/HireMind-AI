import re
import spacy
from typing import List, Tuple
from pydantic import BaseModel
from app.utils.logging import app_logger

class ParsedJobDescription(BaseModel):
    required_skills: List[str]
    preferred_skills: List[str]
    negative_signals: List[str]
    experience_range: Tuple[int, int] # (min_years, max_years)
    preferred_traits: List[str]

# Core taxonomies for offline classification
SKILLS_TAXONOMY = [
    "python", "fastapi", "django", "flask", "go", "golang", "rust", "typescript", "javascript",
    "react", "next.js", "nextjs", "vue", "angular", "node", "nodejs", "sql", "postgresql", "postgres",
    "mongodb", "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "pytorch", "tensorflow", "pandas",
    "numpy", "c++", "java", "spring", "graphql", "redis", "kafka", "celery", "scikit-learn", "sklearn",
    "vector database", "qdrant", "pinecone", "faiss", "milvus", "elasticsearch", "llm", "embeddings",
    "retrieval", "search", "ranking", "recommender", "recommendation", "mlops", "ab testing", "a/b testing",
    "ndcg", "mrr", "map", "lora", "qlora", "fine-tuning", "finetuning", "distributed systems", "hr tech",
    "learning to rank", "ltr", "evaluation frameworks"
]

TRAITS_TAXONOMY = [
    "startup", "founding", "growth", "independent", "scale", "leader", "senior", "ownership",
    "fast-paced", "velocity", "self-starter"
]

NEGATIVE_PATTERNS = [
    r"pure research", r"academia only", r"prompt engineering only", r"no production", 
    r"not writing production code", r"non-production", r"no coding", r"theoretical background only"
]

def load_nlp():
    try:
        nlp = spacy.load("en_core_web_sm")
        return nlp
    except Exception as e:
        app_logger.warning("spaCy 'en_core_web_sm' model not found, falling back to basic tokenizer.")
        # Minimal fallback tokenizer using basic spacy/python structures
        return None

def clean_text(text: str) -> str:
    return text.lower().strip()

def extract_years_of_experience(text: str) -> Tuple[int, int]:
    # Look for patterns: "X-Y years", "X+ years", "at least X years", "X to Y years"
    text_lower = text.lower()
    
    # 1. Pattern: X to Y years or X-Y years
    range_match = re.search(r"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years|yrs)", text_lower)
    if range_match:
        return int(range_match.group(1)), int(range_match.group(2))
        
    # 2. Pattern: X+ years
    plus_match = re.search(r"(\d+)\s*\+\s*(?:years|yrs)", text_lower)
    if plus_match:
        min_exp = int(plus_match.group(1))
        return min_exp, max(15, min_exp + 5)
        
    # 3. Pattern: at least X years or X years of experience
    single_match = re.search(r"(?:at least|minimum of|require|need)\s*(\d+)\s*(?:years|yrs)", text_lower)
    if single_match:
        min_exp = int(single_match.group(1))
        return min_exp, max(15, min_exp + 5)
        
    generic_match = re.search(r"(\d+)\s*(?:years|yrs)", text_lower)
    if generic_match:
        min_exp = int(generic_match.group(1))
        return min_exp, max(15, min_exp + 5)

    return (0, 15) # Default range

def parse_job_description(jd_text: str) -> ParsedJobDescription:
    cleaned = clean_text(jd_text)
    nlp = load_nlp()
    
    required_skills = []
    preferred_skills = []
    preferred_traits = []
    negative_signals = []
    
    # 1. Extract years of experience
    exp_range = extract_years_of_experience(jd_text)
    
    # 2. Extract negative signals via regex patterns
    for pat in NEGATIVE_PATTERNS:
        if re.search(pat, cleaned):
            match_str = re.findall(pat, cleaned)[0]
            if isinstance(match_str, tuple):
                match_str = match_str[0]
            negative_signals.append(match_str)
            
    # 3. Extract skills and partition into Required vs Preferred
    # We do a sentence-level segmentation to see if skills appear near keywords
    sentences = []
    if nlp:
        doc = nlp(jd_text)
        sentences = [sent.text.lower() for sent in doc.sents]
    else:
        # Fallback split
        sentences = [s.strip() for s in re.split(r"[.!?\n]", cleaned) if s.strip()]
        
    # Check for skills in each sentence and check context
    for sent in sentences:
        # Determine if sentence implies preferred / optional requirements
        is_preferred = any(w in sent for w in ["preferred", "nice to have", "plus", "bonus", "optional", "desired", "highly welcome", "should have", "helpful"])
        
        # Check matching taxonomy skills
        for skill in SKILLS_TAXONOMY:
            # Word boundary matching with optional plural s
            pattern = rf"\b{re.escape(skill)}s?\b"
            if skill in ["next.js", "nextjs"]:
                pattern = r"\bnext\.?js\b"
            elif skill in ["go", "golang"]:
                pattern = r"\bgo(lang)?\b"
                
            if re.search(pattern, sent):
                skill_name = skill.replace("nextjs", "next.js").replace("golang", "go")
                if is_preferred:
                    if skill_name not in preferred_skills:
                        preferred_skills.append(skill_name)
                else:
                    if skill_name not in required_skills:
                        required_skills.append(skill_name)
                        
    # Clean duplicates: if a skill is in required, remove from preferred
    preferred_skills = [s for s in preferred_skills if s not in required_skills]
    
    # 4. Extract traits
    for trait in TRAITS_TAXONOMY:
        if re.search(rf"\b{re.escape(trait)}\b", cleaned):
            preferred_traits.append(trait)
            
    # Ensure lists are unique and sorted
    required_skills = sorted(list(set(required_skills)))
    preferred_skills = sorted(list(set(preferred_skills)))
    preferred_traits = sorted(list(set(preferred_traits)))
    negative_signals = sorted(list(set(negative_signals)))
    
    return ParsedJobDescription(
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        negative_signals=negative_signals,
        experience_range=exp_range,
        preferred_traits=preferred_traits
    )
