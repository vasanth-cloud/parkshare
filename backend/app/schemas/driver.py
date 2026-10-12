from typing import List, Optional
from pydantic import BaseModel

class DriverProfileSchema(BaseModel):
    id: str
    name: str
    photo: str
    rating: float = 4.9
    trips: int = 0
    experienceYears: int
    transmission: List[str]
    languages: List[str]
    badge: str = "Verified Chauffeur"
    eta: str = "10 mins"
    hourlyRate: float
    isAvailable: bool = True
    phone: Optional[str] = None
    city: Optional[str] = "Bengaluru"
    dlNumber: Optional[str] = None
    status: str = "ACTIVE"  # PENDING_APPROVAL, ACTIVE, REJECTED
    rejectionReason: Optional[str] = None
    createdAt: Optional[str] = None

class DriverRegistrationCreate(BaseModel):
    name: str
    phone: str
    city: str = "Bengaluru"
    dlNumber: str
    experienceYears: int
    transmission: List[str]  # ["Manual", "Automatic"]
    languages: List[str] = ["Kannada", "English"]
    hourlyRate: float = 149.0
    photo: Optional[str] = None
    tripTypes: Optional[List[str]] = None

class DriverApprovalAction(BaseModel):
    status: str  # ACTIVE, REJECTED, SUSPENDED
    reason: Optional[str] = None

class DriverBookingCreate(BaseModel):
    tripType: str  # CITY, NIGHT, OUTSTATION, VALET
    transmission: str  # ANY, MANUAL, AUTOMATIC
    pickupLocation: str
    durationHours: int = 2
    bookingDate: str
    bookingTime: str
    driverId: Optional[str] = None
    notes: Optional[str] = None

class DriverBookingOut(BaseModel):
    bookingId: str
    driver: DriverProfileSchema
    tripType: str
    pickupLocation: str
    durationHours: int
    totalFare: float
    otp: int
    status: str
    createdAt: str
