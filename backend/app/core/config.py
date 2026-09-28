import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ParkShare API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    # Default fallback to SQLite for local development/testing without PostgreSQL service setup
    DATABASE_URL: str = "sqlite:///./parkshare.db"
    
    # JWT Authentication
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Payment (Razorpay)
    RAZORPAY_KEY_ID: str = "rzp_test_parkshare_mock_key"
    RAZORPAY_KEY_SECRET: str = "rzp_test_parkshare_mock_secret"
    RAZORPAY_MOCK_MODE: bool = True  # Enable mock payment verification for local development
    
    # Platform Commission & Fees
    PLATFORM_COMMISSION_PERCENTAGE: float = 10.0  # 10% platform fee
    TAX_PERCENTAGE: float = 5.0  # 5% GST/Tax

    # CORS Allowed Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    # File Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
