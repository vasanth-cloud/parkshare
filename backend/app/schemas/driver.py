from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Driver Partner (host app)
# ---------------------------------------------------------------------------

class DriverRegistrationCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=10, max_length=50)
    photo_url: Optional[str] = None

    city: str = Field(..., min_length=2, max_length=120)
    service_area: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius_km: float = 15.0

    dl_number: str = Field(..., min_length=8, max_length=50)
    dl_expiry_date: Optional[str] = None
    dl_document_url: str = Field(..., min_length=3)

    # Optional. Aadhaar is collected on partner sign-up; if omitted, the existing host KYC is reused.
    aadhaar_number: Optional[str] = None
    aadhaar_document_url: Optional[str] = None

    experience_years: int = Field(1, ge=0, le=60)
    transmissions: List[str] = ["Manual", "Automatic"]
    vehicle_categories: List[str] = ["HATCHBACK", "SEDAN", "SUV"]
    languages: List[str] = ["English"]
    trip_types: List[str] = ["CITY"]


class DriverProfileOut(BaseModel):
    """Full profile. Only returned to the driver themself or an admin."""
    id: int
    user_id: int
    full_name: str
    phone: str
    email: Optional[str] = None
    photo_url: Optional[str] = None
    city: str
    service_area: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius_km: float
    dl_number: str
    dl_expiry_date: Optional[str] = None
    dl_document_url: Optional[str] = None
    dl_verified: bool
    aadhaar_number_masked: str
    aadhaar_document_url: Optional[str] = None
    aadhaar_verified: bool
    kyc_provider: Optional[str] = None
    kyc_verified_at: Optional[datetime] = None
    experience_years: int
    transmissions: List[str]
    vehicle_categories: List[str]
    languages: List[str]
    trip_types: List[str]
    status: str
    rejection_reason: Optional[str] = None
    is_available: bool
    approved_at: Optional[datetime] = None
    rating: float
    rating_count: int
    total_trips: int
    total_earnings: float
    created_at: datetime


class DriverPublicOut(BaseModel):
    """Privacy-safe view shown to customers before payment."""
    id: int
    display_name: str
    photo_url: Optional[str] = None
    city: str
    experience_years: int
    transmissions: List[str]
    vehicle_categories: List[str]
    languages: List[str]
    rating: float
    rating_count: int
    total_trips: int
    badge: str


class DriverContactOut(DriverPublicOut):
    """Revealed to the customer only after the advance payment is confirmed."""
    full_name: str
    phone: str
    dl_number_masked: str


class DriverAvailabilityUpdate(BaseModel):
    is_available: bool


class DriverStatusAction(BaseModel):
    status: str  # ACTIVE / SUSPENDED / REJECTED / PENDING_APPROVAL
    reason: Optional[str] = None


class DriverEarningsOut(BaseModel):
    total_earnings: float
    total_trips: int
    this_month_earnings: float
    this_month_trips: int
    pending_requests: int
    upcoming_trips: int
    active_trip_id: Optional[int] = None
    rating: float
    rating_count: int


# ---------------------------------------------------------------------------
# Pricing (admin controlled)
# ---------------------------------------------------------------------------

class DriverPricingOut(BaseModel):
    hourly_rate: float
    platform_fee_percent: float
    tax_percent: float
    min_billable_hours: float
    night_surcharge_percent: float
    night_start_hour: int
    night_end_hour: int
    outstation_hourly_rate: float
    outstation_min_hours: float
    car_type_multipliers: Dict[str, float]
    billing_increment_minutes: int
    updated_at: Optional[datetime] = None


class DriverPricingUpdate(BaseModel):
    hourly_rate: Optional[float] = Field(None, ge=1)
    platform_fee_percent: Optional[float] = Field(None, ge=0, le=100)
    tax_percent: Optional[float] = Field(None, ge=0, le=100)
    min_billable_hours: Optional[float] = Field(None, ge=0.5, le=24)
    night_surcharge_percent: Optional[float] = Field(None, ge=0, le=200)
    night_start_hour: Optional[int] = Field(None, ge=0, le=23)
    night_end_hour: Optional[int] = Field(None, ge=0, le=23)
    outstation_hourly_rate: Optional[float] = Field(None, ge=1)
    outstation_min_hours: Optional[float] = Field(None, ge=1)
    car_type_multipliers: Optional[Dict[str, float]] = None
    billing_increment_minutes: Optional[int] = Field(None, ge=1, le=120)


# ---------------------------------------------------------------------------
# Estimate & Booking (customer app)
# ---------------------------------------------------------------------------

class DriverEstimateRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    car_type: str = "SEDAN"
    pickup_city: Optional[str] = None


class FareBreakdownOut(BaseModel):
    hours: float
    billable_hours: float
    hourly_rate: float
    car_type: str
    car_multiplier: float
    effective_hourly_rate: float
    night_hours: float
    night_surcharge: float
    trip_type: str
    driver_fee: float
    platform_fee_percent: float
    platform_fee: float
    tax_percent: float
    tax: float
    total: float
    available_drivers: int = 0


class DriverBookingCreate(BaseModel):
    pickup_address: str = Field(..., min_length=3)
    pickup_city: str = Field(..., min_length=2)
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    drop_address: Optional[str] = None
    start_time: datetime
    end_time: datetime
    car_type: str = "SEDAN"
    transmission: str = "MANUAL"
    seater: int = Field(5, ge=2, le=12)
    car_make_model: Optional[str] = None
    car_registration: Optional[str] = None
    notes: Optional[str] = None


class DriverBookingCancel(BaseModel):
    reason: Optional[str] = None


class TripOtpRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=6)


class DriverPaymentOrderOut(BaseModel):
    payment_id: int
    booking_id: int
    booking_reference: str
    order_id: str
    purpose: str
    amount: float
    amount_in_paise: int
    currency: str
    key_id: str
    mock_mode: bool
    description: str


class DriverPaymentVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str = ""


class DriverTripRating(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class CustomerBriefOut(BaseModel):
    id: int
    full_name: str
    phone_number: Optional[str] = None  # only revealed to the assigned driver after payment


class DriverBookingOut(BaseModel):
    id: int
    booking_reference: str
    customer_id: int
    driver_id: Optional[int] = None
    status: str

    pickup_address: str
    pickup_city: str
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    drop_address: Optional[str] = None
    start_time: datetime
    end_time: datetime
    trip_type: str

    car_type: str
    transmission: str
    seater: int
    car_make_model: Optional[str] = None
    car_registration: Optional[str] = None
    notes: Optional[str] = None

    hourly_rate: float
    car_multiplier: float
    platform_fee_percent: float
    tax_percent: float
    estimated_hours: float
    estimated_driver_fee: float
    estimated_platform_fee: float
    estimated_tax: float
    estimated_total: float

    accepted_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    trip_started_at: Optional[datetime] = None
    trip_ended_at: Optional[datetime] = None

    # OTPs are only serialised for the customer (the driver must ask the customer)
    start_otp: Optional[str] = None
    end_otp: Optional[str] = None

    actual_hours: Optional[float] = None
    billable_hours: Optional[float] = None
    overtime_hours: float = 0.0
    final_driver_fee: Optional[float] = None
    final_platform_fee: Optional[float] = None
    final_tax: Optional[float] = None
    final_total: Optional[float] = None
    amount_paid: float = 0.0
    balance_due: float = 0.0
    driver_earning: float = 0.0

    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    refund_amount: float = 0.0

    customer_rating: Optional[int] = None
    customer_review: Optional[str] = None

    # Relations – shaped according to the viewer
    driver: Optional[DriverPublicOut] = None
    driver_contact: Optional[DriverContactOut] = None
    customer: Optional[CustomerBriefOut] = None

    # Convenience for live UIs
    live_elapsed_minutes: Optional[float] = None
    live_running_total: Optional[float] = None

    created_at: datetime
    updated_at: Optional[datetime] = None


class DriverAdminSummaryOut(BaseModel):
    total_drivers: int
    active_drivers: int
    pending_drivers: int
    suspended_drivers: int
    online_drivers: int
    total_bookings: int
    open_requests: int
    live_trips: int
    completed_trips: int
    gross_collected: float
    platform_commission: float
    driver_payouts: float
