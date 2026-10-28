from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

class CarSpaServiceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    duration_minutes: int = Field(45, ge=15, le=480)


class CarSpaServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    is_active: Optional[bool] = None


class CarSpaServiceOut(BaseModel):
    id: int
    center_id: int
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    is_active: bool

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Centers
# ---------------------------------------------------------------------------

class CarSpaCenterCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    city: str = Field(..., min_length=2, max_length=120)
    address: str = Field(..., min_length=5)
    phone: str = Field(..., min_length=8, max_length=50)
    description: Optional[str] = None
    photo_url: Optional[str] = None
    operating_hours: str = "08:00 AM - 08:00 PM"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    services: List[CarSpaServiceCreate] = Field(default_factory=list)


class CarSpaCenterUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    city: Optional[str] = Field(None, min_length=2, max_length=120)
    address: Optional[str] = Field(None, min_length=5)
    phone: Optional[str] = Field(None, min_length=8, max_length=50)
    description: Optional[str] = None
    photo_url: Optional[str] = None
    operating_hours: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CarSpaCenterOut(BaseModel):
    id: int
    host_id: int
    name: str
    city: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None  # redacted for unpaid public views
    description: Optional[str] = None
    photo_url: Optional[str] = None
    operating_hours: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    distance_km: Optional[float] = None
    services: List[CarSpaServiceOut] = Field(default_factory=list)
    contact_unlocked: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CarSpaStatusAction(BaseModel):
    status: str  # ACTIVE, SUSPENDED, REJECTED
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class CarSpaBookingCreate(BaseModel):
    center_id: int
    service_id: int
    wanted_date: date
    customer_note: Optional[str] = None


class CarSpaAssignSlot(BaseModel):
    slot_start: datetime
    slot_end: Optional[datetime] = None


class CarSpaCustomerBrief(BaseModel):
    id: int
    full_name: str
    phone_number: Optional[str] = None
    email: Optional[str] = None


class CarSpaBookingOut(BaseModel):
    id: int
    booking_reference: str
    center_id: int
    service_id: Optional[int] = None
    customer_id: int
    service_name: str
    service_price: float
    spa_name: str
    spa_city: str
    spa_address: Optional[str] = None
    spa_phone: Optional[str] = None
    wanted_date: date
    customer_note: Optional[str] = None
    slot_start: Optional[datetime] = None
    slot_end: Optional[datetime] = None
    status: str
    amount_paid: float = 0.0
    paid_at: Optional[datetime] = None
    contact_unlocked: bool = False
    customer: Optional[CarSpaCustomerBrief] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CarSpaPaymentOrderOut(BaseModel):
    payment_id: int
    booking_id: int
    booking_reference: str
    order_id: str
    amount: float
    amount_in_paise: int
    currency: str
    key_id: str
    mock_mode: bool
    description: str


class CarSpaPaymentVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str = ""


# ---------------------------------------------------------------------------
# Legacy aliases kept so older admin/host UI imports do not explode mid-migration
# ---------------------------------------------------------------------------

class SpaPackageSchema(BaseModel):
    id: str
    name: str
    tagline: str = ""
    price: float
    durationMinutes: int = 45
    popular: bool = False
    features: List[str] = Field(default_factory=list)
    recommendedFor: str = ""


class CarSpaCenterSchema(CarSpaCenterOut):
    """Backward-compatible alias. """
    pass


class CarSpaRegistrationCreate(CarSpaCenterCreate):
    centerName: Optional[str] = None
    ownerName: Optional[str] = None
    servicesOffered: List[str] = Field(default_factory=list)
    serviceType: Optional[str] = None
    bayCapacity: Optional[int] = None
