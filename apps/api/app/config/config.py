from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "HireMind AI API"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # PostgreSQL Configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/hiremind"
    
    # Redis Configuration
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Batch Processing Config
    CANDIDATE_IMPORT_CHUNK_SIZE: int = 2000
    
    # Security / CORS
    CORS_ORIGINS: str = "*"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
