import json
import uuid
import random
import os
from datetime import datetime

# Sample data pools for realistic candidate generation
NAMES = [
    "John Doe", "Jane Smith", "Michael Johnson", "Emily Davis", "David Miller",
    "Sarah Wilson", "James Taylor", "Jessica Anderson", "Robert Thomas", "Karen Jackson",
    "William White", "Nancy Harris", "Joseph Martin", "Betty Thompson", "Charles Garcia",
    "Dorothy Martinez", "Daniel Robinson", "Sandra Clark", "Matthew Rodriguez", "Ashley Lewis",
    "Alex Chen", "Priya Sharma", "Aleksei Ivanov", "Yuki Tanaka", "Carlos Silva",
    "Fatima Al-Sayed", "Elena Popova", "Amara Diallo", "Sven Lindstrom", "Hans Müller"
]

TITLES = [
    "Software Engineer", "Senior Software Engineer", "Staff Software Engineer",
    "Frontend Engineer", "Senior Frontend Engineer", "Backend Engineer", "Senior Backend Engineer",
    "Full Stack Engineer", "Senior Full Stack Engineer", "DevOps Engineer", "Cloud Architect",
    "Data Scientist", "ML Engineer", "Engineering Manager", "Technical Product Manager"
]

LOCATIONS = [
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX", 
    "Boston, MA", "Chicago, IL", "Denver, CO", "Los Angeles, CA",
    "London, UK", "Berlin, Germany", "Tokyo, Japan", "Toronto, Canada"
]

COMPANIES = [
    "Google", "Meta", "Apple", "Netflix", "Amazon", "Stripe", "Airbnb", 
    "Uber", "Coinbase", "Snowflake", "Databricks", "Salesforce", "Microsoft", 
    "OpenAI", "Anthropic", "Redrob"
]

SKILLS_POOL = [
    "Python", "FastAPI", "Django", "Flask", "Go", "Rust", "TypeScript", "JavaScript",
    "React", "Next.js", "Vue", "Angular", "Node.js", "SQL", "PostgreSQL", "MongoDB",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "PyTorch", "TensorFlow", "Pandas",
    "NumPy", "C++", "Java", "Spring Boot", "GraphQL", "Redis", "Kafka", "Celery"
]

DEGREES = [
    "B.S. in Computer Science", "M.S. in Computer Science", "B.S. in Software Engineering",
    "Ph.D. in Machine Learning", "B.A. in Mathematics", "M.S. in Data Science"
]

UNIVERSITIES = [
    "Stanford University", "MIT", "UC Berkeley", "Carnegie Mellon University",
    "Harvard University", "Caltech", "Georgia Tech", "University of Washington",
    "Oxford University", "Technical University of Munich", "University of Waterloo"
]

def generate_candidate():
    candidate_id = str(uuid.uuid4())
    name = f"{random.choice(NAMES)} {random.randint(100, 999)}" # Add digits to make 100k names semi-unique
    title = random.choice(TITLES)
    loc = random.choice(LOCATIONS)
    
    # Pick 4-10 random skills
    skills = random.sample(SKILLS_POOL, k=random.randint(4, 10))
    
    # Career history
    career = []
    num_jobs = random.randint(1, 4)
    start_year = 2026 - random.randint(2, 12)
    for i in range(num_jobs):
        company = random.choice(COMPANIES)
        job_title = random.choice(TITLES) if i == 0 else f"Junior {random.choice(TITLES)}"
        duration = random.randint(1, 3)
        end_year = start_year + duration
        
        career.append({
            "company": company,
            "role": job_title,
            "start_date": f"{start_year}-01-01",
            "end_date": f"{end_year}-01-01" if end_year < 2026 else None,
            "description": f"Responsible for building high-performance systems and managing product lifecycle at {company}."
        })
        start_year = end_year
    
    # Education
    education = [{
        "institution": random.choice(UNIVERSITIES),
        "degree": random.choice(DEGREES),
        "grad_year": start_year - random.randint(1, 4)
    }]
    
    # Recruiter behavioral signals
    total_exp = float(2026 - education[0]["grad_year"])
    signals = {
        "loyalty_score": round(random.uniform(0.3, 0.95), 2),
        "promotion_speed": random.choice(["fast", "normal", "slow"]),
        "years_of_experience": max(0.5, total_exp),
        "recent_role_duration": round(random.uniform(0.5, 4.0), 1)
    }
    
    return {
        "candidate_id": candidate_id,
        "profile": {
            "name": name,
            "title": title,
            "location": loc,
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "phone": f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            "summary": f"Experienced {title} with skills in {', '.join(skills[:3])}."
        },
        "career": career,
        "skills": skills,
        "education": education,
        "signals": signals
    }

def main(count=100000, output_path="data/raw/candidates.jsonl"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    print(f"Generating {count} mock candidates and writing to {output_path}...")
    
    start_time = datetime.now()
    with open(output_path, "w") as f:
        for idx in range(count):
            candidate = generate_candidate()
            f.write(json.dumps(candidate) + "\n")
            if (idx + 1) % 10000 == 0:
                print(f"  Generated {idx + 1}/{count} candidates...")
                
    duration = (datetime.now() - start_time).total_seconds()
    print(f"Generation complete! Created {count} candidates in {duration:.2f} seconds.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=100000, help="Number of candidates to generate")
    parser.add_argument("--output", type=str, default="data/raw/candidates.jsonl", help="Output file path")
    args = parser.parse_args()
    
    main(count=args.count, output_path=args.output)
