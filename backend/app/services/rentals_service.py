import random
from datetime import datetime, timezone
from typing import List, Optional
from app.schemas.rentals import (
    RentalVehicleSchema,
    RentalBookingCreate,
    RentalBookingOut,
    RentalPartnerCreate,
)

SAMPLE_FLEET: List[RentalVehicleSchema] = [
    RentalVehicleSchema(
        id="veh-creta-01",
        name="Hyundai Creta SX (O)",
        vehicleType="CAR",
        category="SUV",
        photo="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        rating=4.95,
        trips=48,
        transmission="AUTOMATIC",
        fuelType="PETROL",
        seats=5,
        mileageOrRange="16.8 kmpl",
        hourlyRate=189.0,
        dailyRate=2499.0,
        securityDeposit=0.0,
        isAvailable=True,
        badge="Zero Deposit • Sunroof",
        features=["Panoramic Sunroof", "Ventilated Seats", "Apple CarPlay", "Zero Deposit", "Sanitized"],
        city="Bengaluru",
        hubAddress="Indiranagar 100ft Road Metro Hub, Bengaluru",
        status="ACTIVE",
        partnerName="Apex Prime Fleet",
        rcNumber="KA-03-MG-2041",
        rcOwnershipType="COMMERCIAL"
    ),
    RentalVehicleSchema(
        id="veh-thar-02",
        name="Mahindra Thar 4x4 Hardtop",
        vehicleType="CAR",
        category="SUV",
        photo="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        rating=4.9,
        trips=34,
        transmission="MANUAL",
        fuelType="DIESEL",
        seats=4,
        mileageOrRange="14.2 kmpl",
        hourlyRate=249.0,
        dailyRate=3299.0,
        securityDeposit=1000.0,
        isAvailable=True,
        badge="4x4 Adventure • Off-Road",
        features=["4x4 Low-Range", "All-Terrain Tires", "Convertible Hardtop", "Hill Descent", "Bluetooth"],
        city="Bengaluru",
        hubAddress="Koramangala 4th Block Hub, Bengaluru",
        status="ACTIVE",
        partnerName="Outback Escapes",
        rcNumber="KA-05-NB-7788",
        rcOwnershipType="COMMERCIAL"
    ),
    RentalVehicleSchema(
        id="veh-nexon-03",
        name="Tata Nexon EV Max",
        vehicleType="CAR",
        category="SUV",
        photo="https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
        rating=4.88,
        trips=62,
        transmission="AUTOMATIC",
        fuelType="ELECTRIC",
        seats=5,
        mileageOrRange="437 km range",
        hourlyRate=169.0,
        dailyRate=2199.0,
        securityDeposit=0.0,
        isAvailable=True,
        badge="Zero Emission • Green",
        features=["Fast Charging Supported", "Regenerative Braking", "Zero Tailpipe Emissions", "Automatic"],
        city="Bengaluru",
        hubAddress="HSR Layout Sector 1 Hub, Bengaluru",
        status="ACTIVE",
        partnerName="EcoMotion SelfDrive",
        rcNumber="KA-01-EQ-9012",
        rcOwnershipType="PRIVATE"
    ),
    RentalVehicleSchema(
        id="veh-swift-04",
        name="Maruti Suzuki Swift ZXi",
        vehicleType="CAR",
        category="HATCHBACK",
        photo="https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80",
        rating=4.82,
        trips=89,
        transmission="AUTOMATIC",
        fuelType="PETROL",
        seats=5,
        mileageOrRange="22.5 kmpl",
        hourlyRate=119.0,
        dailyRate=1499.0,
        securityDeposit=0.0,
        isAvailable=True,
        badge="Best City Commuter",
        features=["Compact & Agile", "High Mileage", "Reverse Camera", "Touchscreen Audio"],
        city="Bengaluru",
        hubAddress="Whitefield ITPL Hub, Bengaluru",
        status="ACTIVE",
        partnerName="CityWheels Express",
        rcNumber="KA-51-AB-3420",
        rcOwnershipType="COMMERCIAL"
    ),
    RentalVehicleSchema(
        id="veh-hunter-05",
        name="Royal Enfield Hunter 350",
        vehicleType="BIKE",
        category="CRUISER",
        photo="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
        rating=4.92,
        trips=75,
        transmission="MANUAL",
        fuelType="PETROL",
        seats=2,
        mileageOrRange="36.2 kmpl",
        hourlyRate=79.0,
        dailyRate=899.0,
        securityDeposit=500.0,
        isAvailable=True,
        badge="Popular Cruiser • Free Helmet",
        features=["Dual-Channel ABS", "USB Charger", "Free Rider Helmet", "Trip Navigator"],
        city="Bengaluru",
        hubAddress="Indiranagar 100ft Road Metro Hub, Bengaluru",
        status="ACTIVE",
        partnerName="Throttle Riders Hub",
        rcNumber="KA-04-HX-4455",
        rcOwnershipType="PRIVATE"
    ),
    RentalVehicleSchema(
        id="veh-ather-06",
        name="Ather 450X Gen 3",
        vehicleType="BIKE",
        category="SCOOTER",
        photo="https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80",
        rating=4.9,
        trips=110,
        transmission="AUTOMATIC",
        fuelType="ELECTRIC",
        seats=2,
        mileageOrRange="146 km range",
        hourlyRate=59.0,
        dailyRate=699.0,
        securityDeposit=0.0,
        isAvailable=True,
        badge="Smart EV • Warp Mode",
        features=["Google Maps on Dashboard", "Warp Mode 0-40 in 3.3s", "Keyless App Unlock", "Free Helmet"],
        city="Bengaluru",
        hubAddress="Koramangala 4th Block Hub, Bengaluru",
        status="ACTIVE",
        partnerName="VoltRider Fleets",
        rcNumber="KA-02-EV-6060",
        rcOwnershipType="PRIVATE"
    ),
    RentalVehicleSchema(
        id="veh-activa-07",
        name="Honda Activa 6G Premium",
        vehicleType="BIKE",
        category="SCOOTER",
        photo="https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=800&q=80",
        rating=4.85,
        trips=145,
        transmission="AUTOMATIC",
        fuelType="PETROL",
        seats=2,
        mileageOrRange="50 kmpl",
        hourlyRate=49.0,
        dailyRate=549.0,
        securityDeposit=0.0,
        isAvailable=True,
        badge="Zero Deposit • Super Easy",
        features=["Smooth CVT", "Combi-Brake System", "Generous Underseat Storage", "Sanitized"],
        city="Bengaluru",
        hubAddress="Majestic Central Hub, Bengaluru",
        status="ACTIVE",
        partnerName="QuickScoot Rentals",
        rcNumber="KA-01-JM-1122",
        rcOwnershipType="COMMERCIAL"
    )
]

SAMPLE_RENTAL_BOOKINGS: List[RentalBookingOut] = []

class RentalsService:
    @staticmethod
    def get_available_vehicles(
        vehicle_type: Optional[str] = None,
        transmission: Optional[str] = None,
        city: Optional[str] = None
    ) -> List[RentalVehicleSchema]:
        results = [v for v in SAMPLE_FLEET if v.status == "ACTIVE" and v.isAvailable]
        if vehicle_type and vehicle_type.upper() != "ALL":
            results = [v for v in results if v.vehicleType.upper() == vehicle_type.upper()]
        if transmission and transmission.upper() != "ANY":
            results = [v for v in results if v.transmission.upper() == transmission.upper()]
        if city and city.strip():
            city_lower = city.lower().strip()
            results = [v for v in results if city_lower in v.city.lower() or city_lower in v.hubAddress.lower()]
        return results

    @staticmethod
    def get_all_vehicles(
        status: Optional[str] = None,
        city: Optional[str] = None
    ) -> List[RentalVehicleSchema]:
        results = SAMPLE_FLEET
        if status and status.upper() != "ALL":
            results = [v for v in results if v.status.upper() == status.upper()]
        if city and city.strip():
            city_lower = city.lower().strip()
            results = [v for v in results if city_lower in v.city.lower()]
        return results

    @staticmethod
    def register_partner(data: RentalPartnerCreate) -> RentalVehicleSchema:
        new_id = f"veh-fleet-{len(SAMPLE_FLEET) + 101}"
        features = data.features or ["Keyless Access", "Sanitized Before Handover", "Verified RC"]
        photo = data.photoUrl or (
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
            if data.vehicleType.upper() == "CAR"
            else "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80"
        )
        new_vehicle = RentalVehicleSchema(
            id=new_id,
            name=data.vehicleName,
            vehicleType=data.vehicleType.upper(),
            category=data.category.upper(),
            photo=photo,
            rating=5.0,
            trips=0,
            transmission=data.transmission.upper(),
            fuelType=data.fuelType.upper(),
            seats=data.seats,
            mileageOrRange=data.mileageOrRange,
            hourlyRate=data.hourlyRate,
            dailyRate=data.dailyRate,
            securityDeposit=data.securityDeposit,
            isAvailable=True,
            badge="New Fleet Partner • Verified",
            features=features,
            city=data.city,
            hubAddress=data.hubAddress,
            status="ACTIVE",
            partnerName=data.ownerName,
            rcNumber=data.rcNumber or data.regNumber,
            rcDocumentUrl=data.rcDocumentUrl,
            rcOwnershipType=data.rcOwnershipType or "PRIVATE",
            insurancePolicyUrl=data.insurancePolicyUrl,
            insuranceExpiry=data.insuranceExpiry,
            payoutUpiId=data.payoutUpiId
        )
        SAMPLE_FLEET.insert(0, new_vehicle)
        return new_vehicle

    @staticmethod
    def update_status(vehicle_id: str, new_status: str, reason: Optional[str] = None) -> RentalVehicleSchema:
        for v in SAMPLE_FLEET:
            if v.id == vehicle_id:
                v.status = new_status.upper()
                return v
        raise ValueError(f"Rental vehicle with id '{vehicle_id}' not found")

    @staticmethod
    def create_booking(data: RentalBookingCreate) -> RentalBookingOut:
        # Find vehicle
        vehicle = next((v for v in SAMPLE_FLEET if v.id == data.vehicleId), None)
        if not vehicle:
            # Fallback to first vehicle
            vehicle = SAMPLE_FLEET[0]

        # Calculate estimated fare (default 24h daily rate)
        base_fare = vehicle.dailyRate
        deposit = vehicle.securityDeposit
        insurance_fee = 99.0 if data.withInsurance else 0.0
        delivery_fee = 149.0 if data.deliveryType == "DOORSTEP_DELIVERY" else 0.0
        grand_total = base_fare + deposit + insurance_fee + delivery_fee

        booking_id = f"RNT-{random.randint(100000, 999999)}"
        otp = random.randint(1000, 9999)
        now_str = datetime.now(timezone.utc).isoformat()

        booking = RentalBookingOut(
            bookingId=booking_id,
            vehicle=vehicle,
            customerName=data.customerName,
            customerPhone=data.customerPhone,
            pickupDate=data.pickupDate,
            returnDate=data.returnDate,
            pickupTime=data.pickupTime,
            deliveryType=data.deliveryType,
            doorstepAddress=data.doorstepAddress,
            totalFare=base_fare,
            securityDeposit=deposit,
            insuranceFee=insurance_fee,
            grandTotal=grand_total,
            otp=otp,
            status="CONFIRMED",
            createdAt=now_str
        )
        SAMPLE_RENTAL_BOOKINGS.append(booking)
        return booking
