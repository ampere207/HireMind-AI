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

# Copy backend codebase
COPY . .

# Pre-cache NLP and Hugging Face models
RUN python download_models.py

# Expose API port
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
