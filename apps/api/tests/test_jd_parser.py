import pytest
from app.services.jd_parser import parse_job_description

def test_jd_parser_skills_extraction():
    jd_text = """
    We are looking for a Senior ML Engineer.
    Must have 5+ years of experience with Python, Vector Databases, and PyTorch.
    Knowledge of retrieval systems and distributed systems is highly preferred.
    It would be a plus to have experience with LoRA and fine-tuning.
    We do not write pure research code or theoretical background only. We build production systems.
    """
    
    parsed = parse_job_description(jd_text)
    
    # Required skills should be extracted
    assert "python" in [s.lower() for s in parsed.required_skills]
    assert "pytorch" in [s.lower() for s in parsed.required_skills]
    assert "vector database" in [s.lower() for s in parsed.required_skills]
    
    # Preferred skills should be extracted
    assert "lora" in [s.lower() for s in parsed.preferred_skills]
    assert "distributed systems" in [s.lower() for s in parsed.preferred_skills]
    
    # Negative signals
    assert len(parsed.negative_signals) >= 1
    assert any("pure research" in sig.lower() for sig in parsed.negative_signals)
    
    # Experience range extraction: 5+ years should map to (5, 15)
    assert parsed.experience_range[0] == 5
    assert parsed.experience_range[1] == 15
    
    # Traits (e.g. senior, scale, startup)
    assert "senior" in [t.lower() for t in parsed.preferred_traits]
