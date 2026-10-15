from typing import List, Optional
from pydantic import BaseModel, Field

class RentalVehicleSchema(BaseModel):
    id: str
    name: str
    vehicleType: str  # CAR, BIKE, EV
    category: str     # HATCHBACK, SEDAN, SUV, SCOOTER, CRUISER
    photo: str
    rating: float = 4.9
    trips: int = 12
    transmission: str # AUTOMATIC, MANUAL
    fuelType: str     # PETROL, DIESEL, ELECTRIC
    seats: int = 5
    mileageOrRange: str
    hourlyRate: float
    dailyRate: float
    securityDeposit: float = 0.0
    isAvailable: bool = True
    badge: str
    features: List[str]
    city: str
    hubAddress: str
    status: str = "ACTIVE" # ACTIVE, PENDING_APPROVAL, SUSPENDED
    partnerName: str
    rcNumber: Optional[str] = None
    rcDocumentUrl: Optional[str] = None
    rcOwnershipType: Optional[str] = "PRIVATE" # PRIVATE, COMMERCIAL, SELF_DRIVE_PERMIT
    insurancePolicyUrl: Optional[str] = None
    insuranceExpiry: Optional[str] = None
    payoutUpiId: Optional[str] = None

class RentalBookingCreate(BaseModel):
    vehicleId: str
    customerName: str
    customerPhone: str
    pickupDate: str
    returnDate: str
    pickupTime: str
    deliveryType: str = "HUB_PICKUP" # HUB_PICKUP, DOORSTEP_DELIVERY
    doorstepAddress: Optional[str] = None
    withInsurance: bool = True
    city: Optional[str] = "Bengaluru"

class RentalBookingOut(BaseModel):
    bookingId: str
    vehicle: RentalVehicleSchema
    customerName: str
    customerPhone: str
    pickupDate: str
    returnDate: str
    pickupTime: str
    deliveryType: str
    doorstepAddress: Optional[str] = None
    totalFare: float
    securityDeposit: float
    insuranceFee: float
    grandTotal: float
    otp: int
    status: str
    createdAt: str

class RentalPartnerCreate(BaseModel):
    vehicleName: str
    vehicleType: str  # CAR, BIKE
    category: str     # HATCHBACK, SEDAN, SUV, SCOOTER, CRUISER
    regNumber: str
    transmission: str # AUTOMATIC, MANUAL
    fuelType: str     # PETROL, DIESEL, ELECTRIC
    seats: int = 5
    mileageOrRange: str
    hourlyRate: float
    dailyRate: float
    securityDeposit: float = 0.0
    ownerName: str
    phone: str
    city: str
    hubAddress: str
    photoUrl: Optional[str] = None
    features: Optional[List[str]] = None
    rcNumber: Optional[str] = None
    rcDocumentUrl: Optional[str] = None
    rcOwnershipType: Optional[str] = "PRIVATE"
    insurancePolicyUrl: Optional[str] = None
    insuranceExpiry: Optional[str] = None
    payoutUpiId: Optional[str] = None

class RentalApprovalAction(BaseModel):
    status: str # ACTIVE, SUSPENDED, REJECTED
    reason: Optional[str] = None
