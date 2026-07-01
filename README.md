# HireMind AI

Welcome to **HireMind AI**, an intelligent, multi-user AI candidate discovery, screening, and neural re-ranking SaaS platform. Built for the Redrob Intelligent Candidate Discovery & Ranking Challenge, HireMind AI provides recruiters with a unified, secure workspace to import vast candidate pools, parse complex job requirements, and generate high-fidelity semantic shortlists using deep learning.

---

## 🏗 System Architecture

```text
                     +---------------------------------------+
                     |         Web Browser Frontend          |
                     |         (Next.js + Tailwind)          |
                     +-------------------+-------------------+
                                         |
                                         | REST HTTP + Bearer JWT
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
                                             |  (Ingestion & |
                                             |   AI Pipeline)|
                                             +---------------+
```

### Stack Detail
- **Frontend (`apps/web`)**: Next.js (App Router), TypeScript, TailwindCSS v4, NextAuth.js (Auth.js), Lucide React, Zustand, React Hook Form, Recharts, Framer Motion.
- **Backend (`apps/api`)**: FastAPI, Python 3.12, UV installer, SQLAlchemy, Celery background worker, PostgreSQL 16 database, Redis (Broker & Cache), Loguru logger.
- **Machine Learning & NLP**: PyTorch, sentence-transformers (`all-MiniLM-L6-v2` for embeddings), cross-encoder (`ms-marco-MiniLM-L-6-v2` for neural re-ranking), `faiss-cpu` (HNSW indexing), and `spaCy` (NLP entity matchers).

---

## 💎 Core Project Features

### 1. Secure Authentication & Strict Data Isolation
- **NextAuth.js credentials provider** on the frontend, routing to secure FastAPI endpoints for JWT-based session token storage and authorization checks.
- **Strict Tenant Isolation**: All staged jobs, neural ranking runs, shortlist details, and diagnostic dashboard metrics are strictly filtered based on the authenticated recruiter's session context (`user_id == current_user.id`).
- Fully protected workspace views with automatic session timeout and route guards.

### 2. High-Speed Candidate Ingestion & Indexing
- **Batched Upsert Pipeline**: Processes massive datasets of candidate profiles in chunks of 2000 using SQLAlchemy PostgreSQL bulk upserts, loading 100k+ profiles in less than 2 minutes.
- **FAISS HNSW Vector Matching**: Compiles candidate profiles (summaries, career history, education, and skills) into rich textual document representations and builds a high-speed HNSW inner-product FAISS index to retrieve the top 2000 candidate query matches.

### 3. Weighted Multi-Dimensional Feature Engineering
Calculates candidate alignment scores across 12 distinct dimensions:
- **Semantic Match**: Cosine alignment with job description semantics.
- **Skills Coverage**: Required vs. preferred skill set matching from parsed requirements.
- **Experience Match**: Tenure fit against requested experience ranges.
- **Production & Startup Scores**: Analysis of candidate's prior work environments.
- **Recruiter Signals**: Promotion velocity, tenure stability, open-to-work flags, and notice period constraints.

### 4. Fraud & Timeline Anomaly Detection
Screens candidates against 6 distinct fraud honeypots:
- Overlapping full-time career timelines (working multiple simultaneous jobs).
- Suspiciously fast promotion speed.
- Inflation of skills inventories relative to tenure length.
- Contradictory summaries and timelines.
- Synthetic profile names.

### 5. Neural Re-Ranking & Explainability Engine
- Runs a Cross-Encoder transformer model on the top 500 retrieved candidates to calculate exact attention-based alignments against the job description text.
- Generates natural language match justification summaries detailing strengths, potential concerns, and overall fit confidence.

### 6. Premium Recruiting Console
- Dark-mode, glassmorphic design featuring async status trackers for running pipeline steps:
  `Understanding JD -> Retrieving -> Engineering Features -> Re-ranking -> Generating Insights`
- **Interactive Recharts Analytics**: Real-time charts representing candidate pool skills distribution, experience brackets, and risk scores.
- **Slide-Out Candidate Detail Drawer**: Fetches and renders full candidate details in real-time, showcasing structured career timelines and active skill lists.
- **CSV Shortlist Exporter**: Generates structured shortlists mapping directly to evaluation criteria with built-in client-side duplication and validation checks.

---

## 📡 API Endpoints Documentation

Exposed REST API routing structure:

| Method | Endpoint | Description |
|---|---|---|
| **POST** | `/auth/register` | Register a new recruiter account |
| **POST** | `/auth/login` | Log in and retrieve a JWT authorization bearer token |
| **GET** | `/auth/me` | Fetch active recruiter account details |
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
| **POST** | `/rank` | Create ranking runs |
| **GET** | `/rank` | List recruiter's ranking runs |
| **GET** | `/rank/{id}` | Fetch details and shortlisted results of a ranking run |
| **GET** | `/rank/{id}/export` | Export the shortlist to a validated CSV file |
