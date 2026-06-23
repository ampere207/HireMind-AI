from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "HireMind AI API"}

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]

def test_jobs_workflow():
    # 1. Create a job
    job_payload = {
        "title": "Software Engineer (Phase 1 Test)",
        "description": "This is a test job description for testing API pipelines.",
        "metadata": {"department": "Engineering", "salary_range": "120k-150k"}
    }
    response = client.post("/jobs", json=job_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == job_payload["title"]
    assert data["description"] == job_payload["description"]
    job_id = data["id"]
    
    # 2. Get the job
    response = client.get(f"/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["id"] == job_id
    
    # 3. List jobs
    response = client.get("/jobs")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    
    # 4. Trigger mock ranking run
    response = client.post(f"/jobs/{job_id}/rankings")
    assert response.status_code == 200
    assert response.json()["job_id"] == job_id
    assert response.json()["status"] == "PENDING"
    
    # 5. Delete job
    response = client.delete(f"/jobs/{job_id}")
    assert response.status_code == 204
    
    # 6. Retrieve deleted job (should fail)
    response = client.get(f"/jobs/{job_id}")
    assert response.status_code == 404
