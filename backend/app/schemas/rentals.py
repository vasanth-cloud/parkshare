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
    lat: Optional[float] = None
    lng: Optional[float] = None
    distanceKm: Optional[float] = None
    doorDeliveryAvailable: bool = True
    status: str = "ACTIVE" # ACTIVE, PENDING_APPROVAL, SUSPENDED
    partnerName: str
    partnerPhone: Optional[str] = None
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
    returnTime: Optional[str] = "06:00 PM"
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
    returnTime: Optional[str] = "06:00 PM"
    deliveryType: str
    doorstepAddress: Optional[str] = None
    totalFare: float
    securityDeposit: float
    insuranceFee: float
    grandTotal: float
    otp: int
    status: str
    createdAt: str
    tripStartedAt: Optional[str] = None
    tripCompletedAt: Optional[str] = None
    hostLat: Optional[float] = None
    hostLng: Optional[float] = None
    customerLat: Optional[float] = None
    customerLng: Optional[float] = None
    ownerName: Optional[str] = None
    ownerPhone: Optional[str] = None
    ownerAddress: Optional[str] = None
    paymentStatus: Optional[str] = "PAID"

class RentalOtpVerifyRequest(BaseModel):
    otp: int

class RentalTripCompleteRequest(BaseModel):
    returnNotes: Optional[str] = None
    finalOdometer: Optional[int] = None

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
    lat: Optional[float] = None
    lng: Optional[float] = None
    distanceKm: Optional[float] = None
    doorDeliveryAvailable: bool = True
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

class RcVerifyRequest(BaseModel):
    reg: str = Field(..., description="Vehicle registration plate number (e.g. KA01AB1234 or AP09CU7296)")
    consent: bool = Field(True, description="Explicit user consent pursuant to DPDP Act 2023")

class RcVerifyResponse(BaseModel):
    valid: bool
    status: Optional[str] = "ACTIVE"
    registered: Optional[str] = None
    owner: Optional[str] = None
    masked: Optional[bool] = False
    ownerNumber: Optional[str] = "1"
    category: Optional[str] = None
    categoryDescription: Optional[str] = None
    makerDescription: Optional[str] = None
    makerModel: Optional[str] = None
    bodyType: Optional[str] = None
    fuelType: Optional[str] = None
    colorType: Optional[str] = None
    fitnessUpto: Optional[str] = None
    insuranceProvider: Optional[str] = None
    insurancePolicyNumber: Optional[str] = None
    insuranceUpto: Optional[str] = None
    commercial: Optional[bool] = False
    blacklistStatus: Optional[str] = "CLEAN"
    rto: Optional[str] = None
    seatingCapacity: Optional[int] = 5
    message: Optional[str] = None
    source: str = "PARIVAHAN_MORTH"  # "LIVE_ATTESTR" or "PARIVAHAN_MORTH_SANDBOX"
