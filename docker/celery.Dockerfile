FROM python:3.12-slim

# Copy uv from astral-sh official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install build dependencies and pg_config dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies using uv
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

# Copy codebase
COPY . .

# Run Celery worker
CMD ["celery", "-A", "app.core.celery_app", "worker", "--loglevel=info"]
