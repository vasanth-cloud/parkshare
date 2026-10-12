from typing import List, Optional
from pydantic import BaseModel

class SpaPackageSchema(BaseModel):
    id: str
    name: str
    tagline: str
    price: float
    durationMinutes: int
    popular: bool = False
    features: List[str]
    recommendedFor: str

class CarSpaCenterSchema(BaseModel):
    id: str
    centerName: str
    ownerName: str
    phone: str
    city: str = "Bengaluru"
    address: str
    serviceType: str = "BOTH"  # DOORSTEP_MOBILE, WORKSHOP_BAY, BOTH
    bayCapacity: int = 2
    operatingHours: str = "08:00 AM - 08:00 PM"
    servicesOffered: List[str] = []
    rating: float = 4.9
    totalOrders: int = 0
    isVerified: bool = True
    status: str = "ACTIVE"  # ACTIVE, PENDING_APPROVAL, SUSPENDED, REJECTED
    photo: Optional[str] = None
    rejectionReason: Optional[str] = None
    createdAt: Optional[str] = None

class CarSpaRegistrationCreate(BaseModel):
    centerName: str
    ownerName: str
    phone: str
    city: str = "Bengaluru"
    address: str
    serviceType: str = "BOTH"  # DOORSTEP_MOBILE, WORKSHOP_BAY, BOTH
    bayCapacity: int = 2
    operatingHours: str = "08:00 AM - 08:00 PM"
    servicesOffered: List[str] = []
    photo: Optional[str] = None

class CarSpaApprovalAction(BaseModel):
    status: str  # ACTIVE, SUSPENDED, REJECTED
    reason: Optional[str] = None

class SpaBookingCreate(BaseModel):
    packageId: str
    vehicleCategory: str  # HATCHBACK, SEDAN, SUV, BIKE
    locationType: str     # DOORSTEP, PARKSHARE_BAY
    address: str
    parkingListingId: Optional[int] = None
    date: str
    timeSlot: str
    notes: Optional[str] = None

class SpaBookingOut(BaseModel):
    bookingId: str
    package: SpaPackageSchema
    vehicleCategory: str
    locationType: str
    address: str
    date: str
    timeSlot: str
    finalPrice: float
    otp: int
    status: str
    createdAt: str
