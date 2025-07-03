from typing import Optional, List, Any
from pydantic_settings import BaseSettings
from pydantic import field_validator
import secrets
import os
from pathlib import Path

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    
    This class uses Pydantic's BaseSettings to automatically load environment
    variables. It will first look for actual environment variables, then fall
    back to values in the .env file if they're not found in the environment.
    
    Default values are provided for development, but should be overridden
    in production through environment variables or .env file.
    """
    # API Settings
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    API_VERSION: str = "1.0.0"
    API_NAME: str = "Intelligent Queue Management System API"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/queue_db"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080", "https://localhost:3000", "https://localhost:8080", "*"]
    
    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    SMS_ENABLED: bool = True
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_SERVER_KEY: Optional[str] = None
    PUSH_ENABLED: bool = True
    
    # Email settings
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@yourapp.com"
    
    # Queue settings
    DEFAULT_QUEUE_SIZE: int = 100
    MAX_QUEUE_SIZE: int = 500
    QUEUE_REFRESH_INTERVAL: int = 30
    
    # File upload settings
    MAX_FILE_SIZE: int = 5242880  # 5MB 
    ALLOWED_FILE_TYPES: List[str] = ["jpg", "jpeg", "png", "pdf"]
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Redis (optional)
    REDIS_URL: Optional[str] = None
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    model_config = {
        # Path to .env file relative to the project root
        "env_file": os.path.join(BASE_DIR, ".env"),
        "case_sensitive": True,
        "extra": "ignore"
    }

# Create a global settings instance
settings = Settings()

# Validate critical settings
if settings.ENVIRONMENT == "production" and settings.SECRET_KEY == secrets.token_urlsafe(32):
    import logging
    logging.warning(
        "WARNING: The SECRET_KEY is using the default value. "
        "Please set the SECRET_KEY environment variable to a secure value in production."
    )