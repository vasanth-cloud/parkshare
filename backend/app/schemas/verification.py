from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class SendMobileOtpRequest(BaseModel):
    phone_number: str = Field(..., description="Mobile number with country code, e.g. +91 9876543210")

class VerifyMobileOtpRequest(BaseModel):
    phone_number: str
    otp: str = Field(..., min_length=4, max_length=6)

class SendEmailOtpRequest(BaseModel):
    email: EmailStr

class VerifyEmailOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=6)

class HostIdentitySubmit(BaseModel):
    legal_name: str = Field(..., min_length=2, description="Full legal name as per Government ID")
    profile_photo_url: str = Field(..., min_length=5, description="Host face profile photo URL")
    gov_id_type: str = Field(..., description="AADHAAR | PAN | DRIVING_LICENCE | PASSPORT")
    gov_id_number: str = Field(..., min_length=4, description="Government ID document number")
    gov_id_document_url: Optional[str] = Field(None, description="Uploaded Government ID document scan/photo")

class VerificationStatusOut(BaseModel):
    is_identity_verified: bool
    can_submit_space: bool
    legal_name: Optional[str] = None
    has_legal_name: bool
    email: Optional[str] = None
    email_verified: bool
    phone_number: Optional[str] = None
    phone_verified: bool
    profile_photo_url: Optional[str] = None
    has_profile_photo: bool
    gov_id_type: Optional[str] = None
    gov_id_number: Optional[str] = None
    gov_id_document_url: Optional[str] = None
    has_gov_id: bool
    id_verification_provider: Optional[str] = None
    id_verified_at: Optional[datetime] = None
    missing_requirements: List[str] = []
