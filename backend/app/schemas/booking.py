from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.booking import BookingStatusEnum, VerificationMethodEnum, CancellationTierEnum
from app.models.listing import BookingProductTypeEnum
from app.schemas.listing import ListingOut
from app.schemas.user import VehicleOut
from app.schemas.review import ReviewOut

class PriceCalculationRequest(BaseModel):
    listing_id: int
    start_time: datetime
    end_time: datetime
    booking_product_type: Optional[BookingProductTypeEnum] = BookingProductTypeEnum.HOURLY

class PriceBreakdown(BaseModel):
    duration_hours: float
    hourly_rate: float
    parking_fee: float
    platform_fee: float
    tax: float
    total_amount: float
    booking_product_type: BookingProductTypeEnum = BookingProductTypeEnum.HOURLY
    plan_name: str = "Short Visit"

class BookingCreate(BaseModel):
    listing_id: int
    vehicle_id: int
    start_time: datetime
    end_time: datetime
    booking_product_type: Optional[BookingProductTypeEnum] = BookingProductTypeEnum.HOURLY

class BookingOut(BaseModel):
    id: int
    booking_reference: str
    user_id: int
    listing_id: int
    vehicle_id: Optional[int] = None
    booking_product_type: BookingProductTypeEnum = BookingProductTypeEnum.HOURLY
    space_number: Optional[str] = "Slot A01"
    start_time: datetime
    end_time: datetime

    verification_code: Optional[str] = None
    qr_token: str

    parking_fee: float
    platform_fee: float
    tax: float
    total_amount: float
    status: BookingStatusEnum
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancellation_tier: Optional[CancellationTierEnum] = None
    refund_amount: float = 0.0
    cancelled_at: Optional[datetime] = None

    listing: Optional[ListingOut] = None
    vehicle: Optional[VehicleOut] = None
    review: Optional[ReviewOut] = None
    host_name: Optional[str] = "Ravi"
    host_phone: Optional[str] = "+91 98765 43210"
    created_at: datetime


    class Config:
        from_attributes = True

class CancellationPreviewOut(BaseModel):
    booking_id: int
    hours_until_start: float
    cancellation_tier: CancellationTierEnum
    total_paid: float
    refund_percentage: float
    refund_amount: float
    cancellation_fee: float
    policy_description: str

class SessionVerifyRequest(BaseModel):
    booking_reference: Optional[str] = None
    verification_code: Optional[str] = None
    qr_token: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    booking_id: int
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    verification_method: Optional[VerificationMethodEnum] = None
    overtime_hours: float = 0.0
    overtime_fee: float = 0.0

    class Config:
        from_attributes = True
