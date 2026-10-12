import random
from datetime import datetime, timezone
from typing import List, Optional
from app.schemas.car_spa import (
    SpaPackageSchema,
    SpaBookingCreate,
    SpaBookingOut,
    CarSpaCenterSchema,
    CarSpaRegistrationCreate,
)

SAMPLE_PACKAGES: List[SpaPackageSchema] = [
    SpaPackageSchema(
        id="ECO_EXPRESS",
        name="Eco Waterless Express",
        tagline="Quick 30-min exterior shine",
        price=199.0,
        durationMinutes=30,
        popular=False,
        features=[
            "Polymer waterless foam wash",
            "Scratch-free microfiber buffing",
            "Windshield & mirror de-greasing",
            "Tire dress & rim wipe",
        ],
        recommendedFor="Daily maintenance & dusty cars",
    ),
    SpaPackageSchema(
        id="FOAM_PRESSURE",
        name="Signature Foam Wash",
        tagline="Deep active foam & wheel care",
        price=399.0,
        durationMinutes=45,
        popular=True,
        features=[
            "High-pressure water rinse",
            "pH-neutral snow foam bath",
            "Deep alloy rim & brake dust removal",
            "Door jamb cleaning & wiper blade degrease",
            "Tire conditioning gloss",
        ],
        recommendedFor="Weekly wash & highway trips",
    ),
    SpaPackageSchema(
        id="DEEP_INTERIOR",
        name="Deep Interior Spa & Steam",
        tagline="Germ-free 99.9% sanitization",
        price=699.0,
        durationMinutes=60,
        popular=False,
        features=[
            "360° deep cabin vacuum (trunk included)",
            "AC vent high-temp steam sterilization",
            "Upholstery & carpet dry foam shampoo",
            "Leather conditioning & matte dash polish",
            "Eliminates odors & bacteria",
        ],
        recommendedFor="Family cars & smoke/dust odors",
    ),
    SpaPackageSchema(
        id="CERAMIC_GLAZE",
        name="3M Ceramic Glaze & Polish",
        tagline="Showroom glossy hydrophobic shield",
        price=1299.0,
        durationMinutes=90,
        popular=False,
        features=[
            "Full exterior clay bar decontamination",
            "Single-stage machine polish (swirl reduction)",
            "3M Ceramic polymer hydrophobic sealant",
            "Glass rain-repellent coat",
            "Long-lasting 6-month shine protection",
        ],
        recommendedFor="Special occasions & high-gloss lovers",
    ),
]

# Active in-memory registered car spas (starts empty; populated by partner registrations)
SAMPLE_SPAS: List[CarSpaCenterSchema] = []

class CarSpaService:
    @staticmethod
    def get_packages() -> List[SpaPackageSchema]:
        """
        List available car spa & detailing packages.
        """
        return SAMPLE_PACKAGES

    @staticmethod
    def get_all_spas(status: Optional[str] = None, city: Optional[str] = None) -> List[CarSpaCenterSchema]:
        """
        List registered car spa centers / mobile detailing units.
        """
        spas = list(SAMPLE_SPAS)
        if status and status != "ALL":
            spas = [s for s in spas if s.status == status]
        if city:
            spas = [s for s in spas if (s.city or "").lower() == city.lower()]
        return spas

    @staticmethod
    def register_spa(data: CarSpaRegistrationCreate) -> CarSpaCenterSchema:
        """
        Register a new car spa center or mobile detailing partner.
        """
        new_id = f"spa-{random.randint(1000, 9999)}"
        photo = data.photo or "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80"
        
        new_spa = CarSpaCenterSchema(
            id=new_id,
            centerName=data.centerName.strip(),
            ownerName=data.ownerName.strip(),
            phone=data.phone.strip(),
            city=data.city.strip() if data.city else "Bengaluru",
            address=data.address.strip(),
            serviceType=data.serviceType,
            bayCapacity=data.bayCapacity or 2,
            operatingHours=data.operatingHours or "08:00 AM - 08:00 PM",
            servicesOffered=data.servicesOffered if data.servicesOffered else ["Foam Wash", "Interior Clean"],
            rating=5.0,
            totalOrders=0,
            isVerified=True,
            status="ACTIVE",
            photo=photo,
            createdAt=datetime.now(timezone.utc).isoformat(),
        )
        SAMPLE_SPAS.insert(0, new_spa)
        return new_spa

    @staticmethod
    def update_spa_status(spa_id: str, status: str, reason: Optional[str] = None) -> CarSpaCenterSchema:
        for s in SAMPLE_SPAS:
            if s.id == spa_id:
                s.status = status
                if reason:
                    s.rejectionReason = reason
                return s
        raise ValueError("Car Spa center not found")

    @staticmethod
    def create_booking(data: SpaBookingCreate) -> SpaBookingOut:
        """
        Book a doorstep or parking bay spa session.
        Applies vehicle size surplus and returns booking confirmation with OTP.
        """
        matched_pkg = SAMPLE_PACKAGES[1]
        for p in SAMPLE_PACKAGES:
            if p.id == data.packageId:
                matched_pkg = p
                break

        surplus_map = {
            "HATCHBACK": 0.0,
            "SEDAN": 50.0,
            "SUV": 100.0,
            "BIKE": -50.0,
        }
        final_price = max(99.0, matched_pkg.price + surplus_map.get(data.vehicleCategory, 0.0))
        booking_id = f"SPA-{random.randint(100000, 999999)}"
        otp = random.randint(1000, 9999)

        return SpaBookingOut(
            bookingId=booking_id,
            package=matched_pkg,
            vehicleCategory=data.vehicleCategory,
            locationType=data.locationType,
            address=data.address,
            date=data.date,
            timeSlot=data.timeSlot,
            finalPrice=final_price,
            otp=otp,
            status="CONFIRMED",
            createdAt=datetime.now(timezone.utc).isoformat(),
        )
