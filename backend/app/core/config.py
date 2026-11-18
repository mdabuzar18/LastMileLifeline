import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LastMile Lifeline"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "demo-insecure-secret-key-lastmile-lifeline-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database: defaults to SQLite for immediate local execution & tests, or PostgreSQL via env
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./lastmile_lifeline.db"
    )
    
    # Redis for resilient task queue
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Notification Worker settings
    WORKER_QUEUE_NAME: str = "lastmile:simulated_notifications"
    WORKER_RETRY_QUEUE: str = "lastmile:simulated_notifications:retry"
    MAX_NOTIFICATION_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 2
    
    # Failure simulation toggle (for demo & tests)
    SIMULATE_FAILURE_RATE: float = float(os.getenv("SIMULATE_FAILURE_RATE", "0.0"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
