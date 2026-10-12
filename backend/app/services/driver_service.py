import random
from datetime import datetime, timezone
from typing import List, Optional
from app.schemas.driver import DriverProfileSchema, DriverBookingCreate, DriverBookingOut, DriverRegistrationCreate

SAMPLE_DRIVERS: List[DriverProfileSchema] = [
    DriverProfileSchema(
        id="d1",
        name="Ramesh K. Kumar",
        photo="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        rating=4.96,
        trips=1420,
        experienceYears=9,
        transmission=["Manual", "Automatic", "EV"],
        languages=["Kannada", "English", "Hindi"],
        badge="Elite Chauffeur",
        eta="8 mins away",
        hourlyRate=149.0,
        isAvailable=True,
        phone="+91 98450 12345",
        city="Bengaluru",
        dlNumber="KA01 20150001234",
        status="ACTIVE",
    ),
    DriverProfileSchema(
        id="d2",
        name="Suresh V. Gowda",
        photo="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        rating=4.92,
        trips=980,
        experienceYears=7,
        transmission=["Automatic", "Luxury SUV"],
        languages=["Kannada", "Telugu", "English"],
        badge="Luxury Specialist",
        eta="12 mins away",
        hourlyRate=169.0,
        isAvailable=True,
        phone="+91 98801 56789",
        city="Bengaluru",
        dlNumber="KA03 20170009876",
        status="ACTIVE",
    ),
    DriverProfileSchema(
        id="d3",
        name="Anand R. Murthy",
        photo="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        rating=4.88,
        trips=2150,
        experienceYears=12,
        transmission=["Manual", "Automatic"],
        languages=["Kannada", "Tamil", "Hindi"],
        badge="Night Drive Pro",
        eta="15 mins away",
        hourlyRate=139.0,
        isAvailable=True,
        phone="+91 97412 34567",
        city="Bengaluru",
        dlNumber="KA05 20120005432",
        status="ACTIVE",
    ),
]

class DriverService:
    @staticmethod
    def get_available_drivers(city: Optional[str] = None, transmission: Optional[str] = None) -> List[DriverProfileSchema]:
        """
        Query available active verified drivers in a specific area/city.
        """
        drivers = [d for d in SAMPLE_DRIVERS if d.status == "ACTIVE" and d.isAvailable]
        if transmission and transmission != "ANY":
            drivers = [d for d in drivers if transmission in d.transmission]
        if city:
            drivers = [d for d in drivers if (d.city or "").lower() == city.lower()]
        return drivers

    @staticmethod
    def get_all_drivers(status: Optional[str] = None, city: Optional[str] = None) -> List[DriverProfileSchema]:
        """
        List all registered drivers (for Admin & Host directories).
        """
        drivers = list(SAMPLE_DRIVERS)
        if status and status != "ALL":
            drivers = [d for d in drivers if d.status == status]
        if city:
            drivers = [d for d in drivers if (d.city or "").lower() == city.lower()]
        return drivers

    @staticmethod
    def register_driver(data: DriverRegistrationCreate) -> DriverProfileSchema:
        """
        Register a new acting driver partner application.
        """
        new_id = f"drv-{random.randint(1000, 9999)}"
        avatar = data.photo or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
        
        new_driver = DriverProfileSchema(
            id=new_id,
            name=data.name.strip(),
            photo=avatar,
            rating=5.0,
            trips=0,
            experienceYears=data.experienceYears,
            transmission=data.transmission if data.transmission else ["Manual", "Automatic"],
            languages=data.languages if data.languages else ["Kannada", "English"],
            badge="New Driver Partner",
            eta="Available",
            hourlyRate=data.hourlyRate,
            isAvailable=True,
            phone=data.phone.strip(),
            city=data.city.strip() if data.city else "Bengaluru",
            dlNumber=data.dlNumber.strip(),
            status="ACTIVE",  # auto-active with instant verification
            createdAt=datetime.now(timezone.utc).isoformat(),
        )
        # Prepend to list
        SAMPLE_DRIVERS.insert(0, new_driver)
        return new_driver

    @staticmethod
    def update_driver_status(driver_id: str, status: str, reason: Optional[str] = None) -> DriverProfileSchema:
        for d in SAMPLE_DRIVERS:
            if d.id == driver_id:
                d.status = status
                if reason:
                    d.rejectionReason = reason
                return d
        raise ValueError("Driver not found")

    @staticmethod
    def create_booking(data: DriverBookingCreate) -> DriverBookingOut:
        """
        Create and dispatch a chauffeur for the consumer.
        Calculates trip total, assigns driver, generates security OTP.
        """
        base_rates = {
            "CITY": 299.0,
            "NIGHT": 399.0,
            "OUTSTATION": 1199.0,
            "VALET": 199.0,
        }
        base = base_rates.get(data.tripType, 299.0)
        extra_hours = max(0, data.durationHours - 2)
        extra_rate = 150.0 if data.tripType == "OUTSTATION" else 99.0
        total_fare = base + (extra_hours * extra_rate)

        # Match driver
        assigned_driver = SAMPLE_DRIVERS[0]
        if data.driverId:
            matched = [d for d in SAMPLE_DRIVERS if d.id == data.driverId]
            if matched:
                assigned_driver = matched[0]

        booking_id = f"DRV-{random.randint(100000, 999999)}"
        otp = random.randint(1000, 9999)

        return DriverBookingOut(
            bookingId=booking_id,
            driver=assigned_driver,
            tripType=data.tripType,
            pickupLocation=data.pickupLocation,
            durationHours=data.durationHours,
            totalFare=total_fare,
            otp=otp,
            status="DRIVER_EN_ROUTE",
            createdAt=datetime.now(timezone.utc).isoformat(),
        )
