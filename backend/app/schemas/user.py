from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRoleEnum, VehicleTypeEnum

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone_number: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.PARKER
    payout_upi_id: Optional[str] = None
    # Host Identity Verification Fields
    legal_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    gov_id_type: Optional[str] = None  # AADHAAR, DRIVING_LICENCE, PASSPORT
    gov_id_number: Optional[str] = None
    gov_id_document_url: Optional[str] = None
    phone_verified: Optional[bool] = False
    email_verified: Optional[bool] = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    phone_verified: bool = False
    email_verified: bool = False
    roles: List[UserRoleEnum]
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class HostProfileCreate(BaseModel):
    legal_name: Optional[str] = None
    business_name: Optional[str] = None
    bio: Optional[str] = None
    payout_bank_account: Optional[str] = None
    payout_ifsc: Optional[str] = None
    payout_upi_id: Optional[str] = None
    profile_photo_url: Optional[str] = None
    gov_id_type: Optional[str] = None
    gov_id_number: Optional[str] = None
    gov_id_document_url: Optional[str] = None

class HostProfileOut(BaseModel):
    id: int
    user_id: int
    legal_name: Optional[str] = None
    business_name: Optional[str] = None
    bio: Optional[str] = None
    payout_upi_id: Optional[str] = None
    profile_photo_url: Optional[str] = None
    gov_id_type: Optional[str] = None
    gov_id_number: Optional[str] = None
    gov_id_document_url: Optional[str] = None
    id_verification_provider: Optional[str] = None
    id_verified_at: Optional[datetime] = None
    is_identity_verified: bool
    total_earnings: float

    class Config:
        from_attributes = True

class HostSummaryOut(BaseModel):
    host_name: str
    this_month_earnings: float
    upcoming_bookings: int
    active_parking: int
    rating: float

class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: VehicleTypeEnum = VehicleTypeEnum.CAR
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    is_default: bool = False

class VehicleOut(BaseModel):
    id: int
    user_id: int
    registration_number: str
    vehicle_type: VehicleTypeEnum
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    is_default: bool

    class Config:
        from_attributes = True
