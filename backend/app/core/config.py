import os
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE_PATH = os.path.join(BACKEND_DIR, ".env")

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
    RAZORPAY_KEY_ID: str = "rzp_test_TjLLsOAid1sNkb"
    RAZORPAY_KEY_SECRET: str = "XwBSc4kZ5fzLRxZSGE72neQC"
    RAZORPAY_MOCK_MODE: bool = False  # Real Razorpay Gateway Test Mode
    
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
    UPLOAD_DIR: str = os.path.join(BACKEND_DIR, "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # Email / SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: str = "noreply@parkshare.in"
    EMAILS_FROM_NAME: str = "ParkShare Identity Verification"

    # SMS Gateway (Fast2SMS / Twilio / MSG91)
    FAST2SMS_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_PHONE: Optional[str] = None

    # Automated KYC Provider (DigiLocker / Cashfree / HyperVerge)
    KYC_PROVIDER_NAME: str = "DigiLocker / UIDAI & NSDL Automated KYC Engine"
    KYC_MOCK_SANDBOX: bool = True
    KYC_API_KEY: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = (ENV_FILE_PATH, ".env")
        extra = "allow"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
