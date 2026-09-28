from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.listing import ParkingTypeEnum, ListingStatusEnum, BookingModeEnum, HostTypeEnum, BookingProductTypeEnum
from app.models.user import VehicleTypeEnum

class ParkingListingImageOut(BaseModel):
    id: int
    image_url: str
    caption: Optional[str] = None
    is_cover: bool

    class Config:
        from_attributes = True

class AvailabilitySlot(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday, -1=Everyday
    start_time: str = "00:00"
    end_time: str = "23:59"
    is_available: bool = True

class PricingRuleCreate(BaseModel):
    hourly_price: float = Field(..., gt=0)
    daily_price: Optional[float] = 250.0
    multi_day_discount_percent: Optional[float] = 15.0
    monthly_price: Optional[float] = 3500.0
    monthly_commuter_price: Optional[float] = 2200.0
    minimum_duration_hours: int = 1
    maximum_duration_hours: int = 720
    security_deposit: float = 0.0

class PricingRuleOut(PricingRuleCreate):
    id: int

    class Config:
        from_attributes = True

class ListingCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    host_type: HostTypeEnum = HostTypeEnum.INDIVIDUAL
    parking_type: ParkingTypeEnum = ParkingTypeEnum.DRIVEWAY
    exact_address: str
    area: str
    city: str
    state: str
    pincode: str
    latitude: float
    longitude: float
    access_instructions: Optional[str] = None
    capacity: int = 1
    total_spaces: int = 1
    dimensions_description: Optional[str] = None
    max_length_m: Optional[float] = None
    max_width_m: Optional[float] = None
    max_height_m: Optional[float] = None
    is_covered: bool = False
    is_indoor: bool = False
    has_cctv: bool = False
    has_ev_charging: bool = False
    has_disabled_access: bool = False
    has_24_7_access: bool = True
    has_gated_access: bool = False
    has_security_guard: bool = False
    allowed_vehicle_types: List[VehicleTypeEnum] = [VehicleTypeEnum.CAR]
    parking_rules: Optional[str] = None
    booking_mode: BookingModeEnum = BookingModeEnum.INSTANT
    pricing_rule: PricingRuleCreate
    availabilities: List[AvailabilitySlot] = []

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    exact_address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    capacity: Optional[int] = None
    max_length_m: Optional[float] = None
    max_width_m: Optional[float] = None
    max_height_m: Optional[float] = None
    is_covered: Optional[bool] = None
    has_24_7_access: Optional[bool] = None
    has_gated_access: Optional[bool] = None
    has_security_guard: Optional[bool] = None
    parking_rules: Optional[str] = None
    status: Optional[ListingStatusEnum] = None
    pricing_rule: Optional[PricingRuleCreate] = None

class HostVerificationOut(BaseModel):
    identity_verified: bool = True
    phone_verified: bool = True
    payout_verified: bool = True
    ownership_verified: bool = True
    listing_approved: bool = True
    is_fully_verified: bool = True

class ListingOut(BaseModel):
    id: int
    host_profile_id: int
    title: str
    description: Optional[str] = None
    host_type: HostTypeEnum = HostTypeEnum.INDIVIDUAL
    parking_type: ParkingTypeEnum
    
    # Location representation
    area: str
    city: str
    state: str
    pincode: str
    approximate_address: str
    latitude: float
    longitude: float
    exact_address: Optional[str] = None  # Exposed only if confirmed booking or host
    access_instructions: Optional[str] = None

    capacity: int
    total_spaces: int = 1
    dimensions_description: Optional[str] = None
    max_length_m: Optional[float] = None
    max_width_m: Optional[float] = None
    max_height_m: Optional[float] = None
    is_covered: bool
    is_indoor: bool
    has_cctv: bool
    has_ev_charging: bool
    has_disabled_access: bool
    has_24_7_access: bool = True
    has_gated_access: bool = False
    has_security_guard: bool = False
    allowed_vehicle_types: List[str]
    parking_rules: Optional[str] = None
    booking_mode: BookingModeEnum
    status: ListingStatusEnum
    average_rating: float
    total_reviews: int

    images: List[ParkingListingImageOut] = []
    pricing_rule: Optional[PricingRuleOut] = None
    host_verification: Optional[HostVerificationOut] = None
    created_at: datetime

    class Config:
        from_attributes = True

