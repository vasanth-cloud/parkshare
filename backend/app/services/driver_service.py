import random
from datetime import datetime, timezone
from typing import List, Optional
from app.schemas.driver import DriverProfileSchema, DriverBookingCreate, DriverBookingOut, DriverRegistrationCreate

# Active in-memory registered drivers (seeded with 3 verified driver partners)
SAMPLE_DRIVERS: List[DriverProfileSchema] = [
    DriverProfileSchema(
        id="drv-101",
        name="Ramesh Kumar",
        photo="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        rating=4.9,
        trips=24,
        experienceYears=8,
        transmission=["Manual", "Automatic", "EV"],
        languages=["Kannada", "English", "Hindi"],
        badge="Top Rated Chauffeur",
        eta="5 mins",
        hourlyRate=179.0,
        isAvailable=True,
        phone="+91 98451 22341",
        city="Bengaluru",
        dlNumber="KA01 20160008912",
        status="ACTIVE",
        createdAt="2025-01-10T10:00:00Z"
    ),
    DriverProfileSchema(
        id="drv-102",
        name="Anand Gowda",
        photo="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
        rating=5.0,
        trips=38,
        experienceYears=6,
        transmission=["Manual", "Automatic"],
        languages=["Kannada", "English"],
        badge="Elite VIP Driver",
        eta="12 mins",
        hourlyRate=199.0,
        isAvailable=True,
        phone="+91 97412 88320",
        city="Bengaluru",
        dlNumber="KA03 20180004921",
        status="ACTIVE",
        createdAt="2025-01-15T11:30:00Z"
    ),
    DriverProfileSchema(
        id="drv-103",
        name="Venkatesh S",
        photo="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        rating=4.8,
        trips=19,
        experienceYears=10,
        transmission=["Manual", "Automatic", "Luxury SUV"],
        languages=["Tamil", "Kannada", "English"],
        badge="Outstation Specialist",
        eta="Available",
        hourlyRate=149.0,
        isAvailable=True,
        phone="+91 99801 44521",
        city="Bengaluru",
        dlNumber="KA05 20140003189",
        status="ACTIVE",
        createdAt="2025-01-20T09:15:00Z"
    )
]

# In-memory driver bookings registry
SAMPLE_DRIVER_BOOKINGS: List[DriverBookingOut] = [
    DriverBookingOut(
        bookingId="DRV-894102",
        driver=SAMPLE_DRIVERS[0],
        tripType="CITY",
        pickupLocation="Indiranagar 100ft Rd, Bengaluru",
        durationHours=3,
        totalFare=398.0,
        otp=5821,
        status="COMPLETED",
        createdAt="2025-02-01T14:30:00Z"
    ),
    DriverBookingOut(
        bookingId="DRV-894103",
        driver=SAMPLE_DRIVERS[1],
        tripType="OUTSTATION",
        pickupLocation="Koramangala 4th Block, Bengaluru",
        durationHours=8,
        totalFare=2099.0,
        otp=4190,
        status="COMPLETED",
        createdAt="2025-02-02T08:00:00Z"
    ),
    DriverBookingOut(
        bookingId="DRV-894104",
        driver=SAMPLE_DRIVERS[2],
        tripType="NIGHT",
        pickupLocation="MG Road, Bengaluru",
        durationHours=4,
        totalFare=597.0,
        otp=7324,
        status="COMPLETED",
        createdAt="2025-02-03T21:15:00Z"
    ),
    DriverBookingOut(
        bookingId="DRV-894105",
        driver=SAMPLE_DRIVERS[0],
        tripType="VALET",
        pickupLocation="UB City, Vittal Mallya Rd, Bengaluru",
        durationHours=2,
        totalFare=396.0,
        otp=9104,
        status="COMPLETED",
        createdAt="2025-02-04T18:45:00Z"
    )
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
        assigned_driver = SAMPLE_DRIVERS[0] if len(SAMPLE_DRIVERS) > 0 else None
        if data.driverId:
            matched = [d for d in SAMPLE_DRIVERS if d.id == data.driverId]
            if matched:
                assigned_driver = matched[0]

        booking_id = f"DRV-{random.randint(100000, 999999)}"
        otp = random.randint(1000, 9999)

        res = DriverBookingOut(
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
        SAMPLE_DRIVER_BOOKINGS.append(res)
        return res

    @staticmethod
    def get_total_revenue() -> float:
        return sum(b.totalFare for b in SAMPLE_DRIVER_BOOKINGS)

    @staticmethod
    def get_total_trips() -> int:
        return len(SAMPLE_DRIVER_BOOKINGS)

    @staticmethod
    def get_all_bookings() -> List[DriverBookingOut]:
        return list(SAMPLE_DRIVER_BOOKINGS)
