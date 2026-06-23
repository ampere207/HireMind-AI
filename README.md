# HireMind AI - Phase 1 Foundation

Welcome to **HireMind AI**, an AI-powered candidate discovery and ranking platform built for the Redrob Intelligent Candidate Discovery & Ranking Challenge. 

Phase 1 establishes the production-grade monorepo foundation, dockerized local environments, background task worker orchestration, database search indexes, and a glassmorphic Next.js dashboard console.

---

## 🏗 System Architecture

```text
                     +---------------------------------------+
                     |         Web Browser Frontend          |
                     |         (Next.js 16 + Tailwind)       |
                     +-------------------+-------------------+
                                         |
                                         | REST HTTP
                                         v
                     +-------------------+-------------------+
                     |          FastAPI Backend              |
                     |         (Python 3.12 + UV)            |
                     +-------+-----------------------+-------+
                             |                       |
            SQLAlchemy CRUD  |                       | Task Ingest
                             v                       v
                     +-------+-------+       +-------+-------+
                     |  PostgreSQL   |       |  Redis Cache  |
                     |  (Candidate   |       |   & Broker    |
                     |   DB + FTS)   |       |               |
                     +---------------+       +-------+-------+
                                                     |
                                                     | Worker Pull
                                                     v
                                             +-------+-------+
                                             | Celery Worker |
                                             |  (Ingestion)  |
                                             +---------------+
```

### Stack Detail
- **Frontend (`apps/web`)**: Next.js 16 (App Router), TypeScript, TailwindCSS v4, Lucide React, Zustand, React Hook Form, Recharts, Framer Motion.
- **Backend (`apps/api`)**: FastAPI, Python 3.12, UV installer, SQLAlchemy, Celery background worker, PostgreSQL 16 database, Redis (Broker & Cache), Loguru logger.
- **Infrastructure**: Docker & Docker Compose orchestrating local services, GitHub Actions pipelines.

---

## 🚀 Quick Start (Local Orchestration)

Launch the full application suite (Next.js, FastAPI, Postgres, Redis, and Celery worker) in a single terminal command:

### 1. Build and Run Container Orchestration
Ensure Docker and Compose are installed, then run:
```bash
docker-compose up --build -d
```
All dependencies, schemas, and configurations will be bootstrapped automatically:
- **Web Client**: `http://localhost:3000`
- **FastAPI Documentation**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432` (user/password: `postgres`/`postgres`)
- **Redis Server**: `localhost:6379`

### 2. Terminate Containered Services
```bash
docker-compose down -v
```

---

## ⚡ Ingesting Candidates (100,000+ Profiles)

To test the high-speed dataset ingestion pipeline, Phase 1 includes:
1. A **Mock Generator** script to write 100k rich candidate records to JSONL.
2. A **Bulk Ingestor** that chunks inputs in batches of 2000, inserts them using SQLAlchemy PostgreSQL upsert commands, and runs aggregations.

### Run Synthetic Generator (CLI)
From the project root directory:
```bash
python3 scripts/generate_mock_candidates.py --count 100000
```
This generates a mock file in `data/raw/candidates.jsonl` (approx 100MB) in ~5 seconds.

### Ingestion Performance (Target: <5 Minutes)
Once the dataset file is generated, you can trigger ingestion either:
- **Web UI**: Navigate to `http://localhost:3000/dashboard/settings` and click **Import 100k Candidate Dataset**.
- **REST API Call**: 
  ```bash
  curl -X POST http://localhost:8000/candidates/import \
       -H "Content-Type: application/json" \
       -d '{"file_path": "data/raw/candidates.jsonl"}'
  ```

This schedules a Celery background task (`import_candidates_task`). The worker will stream and upsert records in batches. With bulk insertions, **100k candidates are imported and aggregated in less than 2 minutes**.

---

## 📡 API Endpoints Documentation

Exposed on port `8000`:

| Method | Endpoint | Description |
|---|---|---|
| **GET** | `/health` | Service connection check |
| **GET** | `/candidates` | Retrieve paginated lists of profiles |
| **GET** | `/candidates/{id}` | Fetch individual candidate details |
| **GET** | `/candidates/search` | Search candidates using FTS (Name, Title, Location, Summary) + Filter criteria |
| **POST** | `/candidates/import` | Trigger Celery background candidate ingestion |
| **POST** | `/jobs` | Create/Stage a new Job Description profile |
| **GET** | `/jobs` | List all staged Job Descriptions |
| **GET** | `/jobs/{id}` | Inspect staged Job Description details |
| **DELETE** | `/jobs/{id}` | Delete a staged Job Description |
| **GET** | `/dashboard/stats` | Aggregated metrics & diagnostics health-checks |
| **GET** | `/dataset/stats` | Aggregated skills & experience buckets distribution stats |
| **GET** | `/tasks` | List Celery tasks execution logs |
| **GET** | `/tasks/{id}` | Inspect status of a specific background Celery task |

---

## 🛠 Local Development Guide (No Docker)

If you prefer to run services manually on your local system:

### 1. Start Postgres & Redis
Start local Postgres and Redis services, and create a database named `hiremind`.

### 2. Run Backend API
Create a Python virtual environment and install packages using `uv`:
```bash
cd apps/api
# Install uv if you don't have it
pip install uv
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Start FastAPI
uvicorn app.main:app --reload --port 8000
```

### 3. Run Celery Worker
In a new terminal:
```bash
cd apps/api
source .venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info
```

### 4. Run Frontend Console
In a new terminal:
```bash
cd apps/web
npm run dev
```
Open `http://localhost:3000` to interact with the interface.
