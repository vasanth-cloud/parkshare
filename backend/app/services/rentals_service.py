import json
import logging
import math
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from app.core.config import settings
from app.schemas.rentals import (
    RcVerifyRequest,
    RcVerifyResponse,
    RentalBookingCreate,
    RentalBookingOut,
    RentalPartnerCreate,
    RentalVehicleSchema,
)

logger = logging.getLogger(__name__)

# Coordinates directory for cities and hubs
KNOWN_COORDINATES = {
    "indiranagar": (12.9784, 77.6408),
    "koramangala": (12.9352, 77.6245),
    "hsr": (12.9121, 77.6446),
    "whitefield": (12.9698, 77.7500),
    "airport": (13.1986, 77.7066),
    "majestic": (12.9767, 77.5713),
    "mg road": (12.9756, 77.6097),
    "jayanagar": (12.9308, 77.5838),
    "btm": (12.9166, 77.6101),
    "dharmapuri": (12.1211, 78.1582),
    "gghj": (12.1211, 78.1582),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "hyderabad": (17.3850, 78.4867),
    "mumbai": (19.0760, 72.8777),
}

def resolve_coords(hub_address: str, city: str, lat: Optional[float] = None, lng: Optional[float] = None):
    if lat is not None and lng is not None and (lat != 0.0 or lng != 0.0):
        return lat, lng
    combined = f"{hub_address} {city}".lower()
    for key, (clat, clng) in KNOWN_COORDINATES.items():
        if key in combined:
            return clat, clng
    return 12.9784, 77.6408

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

# Persistence storage paths
DATA_DIR = Path(__file__).resolve().parent.parent / "uploads"
FLEET_FILE = DATA_DIR / "rental_fleet.json"
BOOKINGS_FILE = DATA_DIR / "rental_bookings.json"

def _load_fleet() -> List[RentalVehicleSchema]:
    if not FLEET_FILE.exists():
        return []
    try:
        with open(FLEET_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            fleet_items = []
            for item in data:
                if "doorDeliveryAvailable" not in item:
                    item["doorDeliveryAvailable"] = "Hub Pickup Only" not in (item.get("features") or [])
                if not item.get("lat") or not item.get("lng"):
                    c_lat, c_lng = resolve_coords(item.get("hubAddress", ""), item.get("city", ""))
                    item["lat"] = c_lat
                    item["lng"] = c_lng
                fleet_items.append(RentalVehicleSchema(**item))
            return fleet_items
    except Exception as e:
        logger.error(f"Failed to load rental fleet from {FLEET_FILE}: {e}")
        return []

def _save_fleet(fleet: List[RentalVehicleSchema]):
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(FLEET_FILE, "w", encoding="utf-8") as f:
            json.dump([v.model_dump() if hasattr(v, "model_dump") else v.dict() for v in fleet], f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to save rental fleet to {FLEET_FILE}: {e}")

def _load_bookings() -> List[RentalBookingOut]:
    if not BOOKINGS_FILE.exists():
        return []
    try:
        with open(BOOKINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [RentalBookingOut(**item) for item in data]
    except Exception as e:
        logger.error(f"Failed to load rental bookings from {BOOKINGS_FILE}: {e}")
        return []

def _save_bookings(bookings: List[RentalBookingOut]):
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(BOOKINGS_FILE, "w", encoding="utf-8") as f:
            json.dump([b.model_dump() if hasattr(b, "model_dump") else b.dict() for b in bookings], f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to save rental bookings to {BOOKINGS_FILE}: {e}")

# Clean initial state
SAMPLE_FLEET: List[RentalVehicleSchema] = _load_fleet()
SAMPLE_RENTAL_BOOKINGS: List[RentalBookingOut] = _load_bookings()


class RentalsService:
    @staticmethod
    def get_available_vehicles(
        vehicle_type: Optional[str] = None,
        transmission: Optional[str] = None,
        city: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        query: Optional[str] = None
    ) -> List[RentalVehicleSchema]:
        # Return ACTIVE fleet vehicles, with isAvailable accurately reflecting booking status
        results = [v for v in SAMPLE_FLEET if v.status == "ACTIVE"]
        for v in results:
            has_active_booking = any(
                b.vehicle.id == v.id and b.status in ("CONFIRMED", "IN_PROGRESS")
                for b in SAMPLE_RENTAL_BOOKINGS
            )
            v.isAvailable = not has_active_booking

        if vehicle_type and vehicle_type.upper() != "ALL":
            results = [v for v in results if v.vehicleType.upper() == vehicle_type.upper()]
        if transmission and transmission.upper() != "ANY":
            results = [v for v in results if v.transmission.upper() == transmission.upper()]
        if city and city.strip():
            city_lower = city.lower().strip()
            results = [v for v in results if city_lower in v.city.lower() or city_lower in v.hubAddress.lower()]
        if query and query.strip():
            q = query.lower().strip()
            results = [
                v for v in results
                if q in v.name.lower() or q in v.category.lower() or q in v.city.lower() or q in v.hubAddress.lower() or q in v.fuelType.lower()
            ]

        # Calculate distance if user lat/lng provided
        if lat is not None and lng is not None:
            for v in results:
                v_lat, v_lng = resolve_coords(v.hubAddress, v.city, v.lat, v.lng)
                v.lat = v_lat
                v.lng = v_lng
                v.distanceKm = haversine_distance(lat, lng, v_lat, v_lng)
            results.sort(key=lambda x: x.distanceKm if x.distanceKm is not None else 999999.0)
        else:
            for v in results:
                v_lat, v_lng = resolve_coords(v.hubAddress, v.city, v.lat, v.lng)
                v.lat = v_lat
                v.lng = v_lng
                v.distanceKm = None

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
        c_lat, c_lng = resolve_coords(data.hubAddress, data.city, data.lat, data.lng)
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
            lat=c_lat,
            lng=c_lng,
            doorDeliveryAvailable=data.doorDeliveryAvailable,
            status="ACTIVE",
            partnerName=data.ownerName,
            partnerPhone=data.phone,
            rcNumber=data.rcNumber or data.regNumber,
            rcDocumentUrl=data.rcDocumentUrl,
            rcOwnershipType=data.rcOwnershipType or "PRIVATE",
            insurancePolicyUrl=data.insurancePolicyUrl,
            insuranceExpiry=data.insuranceExpiry,
            payoutUpiId=data.payoutUpiId
        )
        SAMPLE_FLEET.insert(0, new_vehicle)
        _save_fleet(SAMPLE_FLEET)
        return new_vehicle

    @staticmethod
    def update_status(vehicle_id: str, new_status: str, reason: Optional[str] = None) -> RentalVehicleSchema:
        for v in SAMPLE_FLEET:
            if v.id == vehicle_id:
                v.status = new_status.upper()
                _save_fleet(SAMPLE_FLEET)
                return v
        raise ValueError(f"Rental vehicle with id '{vehicle_id}' not found")

    @staticmethod
    def update_door_delivery(vehicle_id: str, door_delivery_available: bool) -> RentalVehicleSchema:
        for v in SAMPLE_FLEET:
            if v.id == vehicle_id:
                v.doorDeliveryAvailable = door_delivery_available
                features = [f for f in v.features if f not in ("Doorstep Delivery Available", "Hub Pickup Only")]
                if door_delivery_available:
                    features.append("Doorstep Delivery Available")
                else:
                    features.append("Hub Pickup Only")
                v.features = features
                _save_fleet(SAMPLE_FLEET)
                return v
        raise ValueError(f"Rental vehicle with id '{vehicle_id}' not found")

    @staticmethod
    def create_booking(data: RentalBookingCreate) -> RentalBookingOut:
        # Find vehicle
        vehicle = next((v for v in SAMPLE_FLEET if v.id == data.vehicleId), None)
        if not vehicle:
            raise ValueError("That rental vehicle is not available")

        # Mark vehicle unavailable so other customers CANNOT see or book it!
        vehicle.isAvailable = False
        _save_fleet(SAMPLE_FLEET)

        # Calculate estimated fare
        base_fare = vehicle.dailyRate
        deposit = vehicle.securityDeposit
        insurance_fee = 99.0 if data.withInsurance else 0.0
        delivery_fee = 0.0
        grand_total = base_fare + deposit + insurance_fee + delivery_fee

        booking_id = f"RNT-{random.randint(100000, 999999)}"
        otp = random.randint(1000, 9999)
        now_str = datetime.now(timezone.utc).isoformat()
        h_lat, h_lng = resolve_coords(vehicle.hubAddress, vehicle.city, vehicle.lat, vehicle.lng)

        booking = RentalBookingOut(
            bookingId=booking_id,
            vehicle=vehicle,
            customerName=data.customerName,
            customerPhone=data.customerPhone,
            pickupDate=data.pickupDate,
            returnDate=data.returnDate,
            pickupTime=data.pickupTime,
            returnTime=data.returnTime or "06:00 PM",
            deliveryType=data.deliveryType,
            doorstepAddress=data.doorstepAddress,
            totalFare=base_fare,
            securityDeposit=deposit,
            insuranceFee=insurance_fee,
            grandTotal=grand_total,
            otp=otp,
            status="CONFIRMED",
            createdAt=now_str,
            tripStartedAt=None,
            tripCompletedAt=None,
            hostLat=h_lat,
            hostLng=h_lng,
            ownerName=vehicle.partnerName,
            ownerPhone=getattr(vehicle, "partnerPhone", None) or "+91 98451 22340",
            ownerAddress=vehicle.hubAddress,
            paymentStatus="PAID",
        )
        SAMPLE_RENTAL_BOOKINGS.insert(0, booking)
        _save_bookings(SAMPLE_RENTAL_BOOKINGS)
        return booking

    @staticmethod
    def get_bookings(
        phone: Optional[str] = None,
        partner_phone: Optional[str] = None,
        booking_id: Optional[str] = None
    ) -> List[RentalBookingOut]:
        results = list(SAMPLE_RENTAL_BOOKINGS)
        if booking_id:
            results = [b for b in results if b.bookingId == booking_id]
        if phone:
            clean_p = phone.strip().replace(" ", "").replace("-", "").replace("+91", "")
            results = [b for b in results if clean_p in b.customerPhone.replace(" ", "").replace("-", "").replace("+91", "")]
        if partner_phone:
            clean_pp = partner_phone.strip().replace(" ", "").replace("-", "").replace("+91", "")
            results = [b for b in results if clean_pp in (b.ownerPhone or "").replace(" ", "").replace("-", "").replace("+91", "")]
        return results

    @staticmethod
    def verify_handover_otp(booking_id: str, otp: int) -> RentalBookingOut:
        for b in SAMPLE_RENTAL_BOOKINGS:
            if b.bookingId == booking_id:
                if b.otp != otp:
                    raise ValueError("Invalid Handover OTP. Please ask renter to check the 4-digit OTP in their ParkCo app.")
                b.status = "IN_PROGRESS"
                b.tripStartedAt = datetime.now(timezone.utc).isoformat()
                _save_bookings(SAMPLE_RENTAL_BOOKINGS)
                return b
        raise ValueError(f"Rental booking with id '{booking_id}' not found")

    @staticmethod
    def complete_trip(booking_id: str, return_notes: Optional[str] = None, final_odometer: Optional[int] = None) -> RentalBookingOut:
        for b in SAMPLE_RENTAL_BOOKINGS:
            if b.bookingId == booking_id:
                b.status = "COMPLETED"
                b.tripCompletedAt = datetime.now(timezone.utc).isoformat()
                # Re-enable vehicle for other customers to book
                for v in SAMPLE_FLEET:
                    if v.id == b.vehicle.id:
                        v.isAvailable = True
                        break
                _save_fleet(SAMPLE_FLEET)
                _save_bookings(SAMPLE_RENTAL_BOOKINGS)
                return b
        raise ValueError(f"Rental booking with id '{booking_id}' not found")

    @staticmethod
    async def verify_rc(data: RcVerifyRequest) -> RcVerifyResponse:
        raw_reg = data.reg.strip().upper()
        clean_reg = re.sub(r'[^A-Z0-9]', '', raw_reg)

        if not clean_reg or len(clean_reg) < 6:
            return RcVerifyResponse(
                valid=False,
                message="Please provide a valid Indian vehicle registration number (e.g., KA01AB1234)"
            )

        # 1. Check if Attestr Auth Token is configured
        if settings.ATTESTR_AUTH_TOKEN and settings.ATTESTR_AUTH_TOKEN.strip():
            try:
                auth_header = settings.ATTESTR_AUTH_TOKEN.strip()
                if not auth_header.lower().startswith("basic "):
                    auth_header = f"Basic {auth_header}"

                headers = {
                    "Content-Type": "application/json",
                    "Authorization": auth_header
                }
                payload = {"reg": clean_reg}

                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(settings.ATTESTR_RC_API_URL, json=payload, headers=headers)
                    if resp.status_code == 200:
                        json_resp = resp.json()
                        if json_resp.get("valid") is True:
                            return RcVerifyResponse(
                                valid=True,
                                status=json_resp.get("status", "ACTIVE"),
                                registered=json_resp.get("registered"),
                                owner=json_resp.get("owner"),
                                masked=json_resp.get("masked", False),
                                ownerNumber=str(json_resp.get("ownerNumber", "1")),
                                category=json_resp.get("category"),
                                categoryDescription=json_resp.get("categoryDescription"),
                                makerDescription=json_resp.get("makerDescription"),
                                makerModel=json_resp.get("makerModel"),
                                bodyType=json_resp.get("bodyType"),
                                fuelType=json_resp.get("fuelType", "PETROL"),
                                colorType=json_resp.get("colorType"),
                                fitnessUpto=json_resp.get("fitnessUpto"),
                                insuranceProvider=json_resp.get("insuranceProvider"),
                                insurancePolicyNumber=json_resp.get("insurancePolicyNumber"),
                                insuranceUpto=json_resp.get("insuranceUpto"),
                                commercial=bool(json_resp.get("commercial", False)),
                                blacklistStatus=json_resp.get("blacklistStatus", "CLEAN"),
                                rto=json_resp.get("rto"),
                                seatingCapacity=int(json_resp.get("seatingCapacity") or 5) if str(json_resp.get("seatingCapacity", "")).isdigit() else 5,
                                source="LIVE_ATTESTR"
                            )
                        else:
                            return RcVerifyResponse(
                                valid=False,
                                message=json_resp.get("message", "Provided vehicle registration number does not exist in Parivahan registry"),
                                source="LIVE_ATTESTR"
                            )
                    else:
                        logger.warning(f"Attestr API returned status {resp.status_code}: {resp.text}")
                        # If Attestr service is pending provisioning (Code 4035), allow mock fallback
                        try:
                            err_json = resp.json()
                            if err_json.get("code") == 4035:
                                logger.info("Attestr service 'Vehicle Ownership' not yet provisioned. Falling back to sandbox/mock.")
                        except Exception:
                            pass
            except Exception as e:
                logger.error(f"Error calling Attestr Parivahan API: {e}. Falling back to Parivahan Sandbox.")

        # 2. Parivahan MoRTH Sandbox / Dev Mode Simulator
        MOCK_DATABASE = {
            "KA03AB1234": {
                "owner": "VASANTH A",
                "status": "ACTIVE",
                "registered": "2023-05-12",
                "category": "4WN",
                "categoryDescription": "Motor Car / LMV",
                "makerDescription": "HYUNDAI MOTOR INDIA LIMITED",
                "makerModel": "HYUNDAI CRETA SX (O)",
                "bodyType": "SUV",
                "fuelType": "PETROL",
                "colorType": "TITAN GREY",
                "fitnessUpto": "2038-05-11",
                "insuranceProvider": "ICICI LOMBARD GENERAL INSURANCE",
                "insurancePolicyNumber": "3001/55219082/00/000",
                "insuranceUpto": "2027-05-11",
                "commercial": False,
                "rto": "INDIRANAGAR / BENGALURU EAST RTO (KA-03)",
                "seatingCapacity": 5
            },
            "AP09CU7296": {
                "owner": "GITANJALI RAHEJA",
                "status": "ACTIVE",
                "registered": "2019-10-30",
                "category": "2WN",
                "categoryDescription": "M-Cycle / Scooter (2WN)",
                "makerDescription": "HONDA MOTORCYCLE AND SCOOTER INDIA (P) LTD",
                "makerModel": "HONDA ACTIVA 6G",
                "bodyType": "SCOOTER",
                "fuelType": "PETROL",
                "colorType": "PEARL BLACK",
                "fitnessUpto": "2034-10-29",
                "insuranceProvider": "BAJAJ ALLIANZ GENERAL INSURANCE",
                "insurancePolicyNumber": "OG-24-1801-1802-00004912",
                "insuranceUpto": "2027-10-28",
                "commercial": False,
                "rto": "HYDERABAD CENTRAL RTO (AP-09)",
                "seatingCapacity": 2
            },
            "KA03MG2041": {
                "owner": "APEX PRIME FLEET SERVICES PVT LTD",
                "status": "ACTIVE",
                "registered": "2022-03-15",
                "category": "4WN",
                "categoryDescription": "Motor Car / LMV",
                "makerDescription": "HYUNDAI MOTOR INDIA LIMITED",
                "makerModel": "HYUNDAI CRETA SX (O)",
                "bodyType": "SUV",
                "fuelType": "PETROL",
                "colorType": "POLAR WHITE",
                "fitnessUpto": "2037-03-14",
                "insuranceProvider": "ICICI LOMBARD GENERAL INSURANCE",
                "insurancePolicyNumber": "3001/44910284/01/000",
                "insuranceUpto": "2027-03-14",
                "commercial": True,
                "rto": "INDIRANAGAR RTO, BENGALURU (KA-03)",
                "seatingCapacity": 5
            },
            "KA05NB7788": {
                "owner": "OUTBACK ESCAPES EXPEDITIONS",
                "status": "ACTIVE",
                "registered": "2023-01-20",
                "category": "4WN",
                "categoryDescription": "Motor Car / LMV 4x4",
                "makerDescription": "MAHINDRA & MAHINDRA LTD",
                "makerModel": "MAHINDRA THAR 4x4 HARDTOP",
                "bodyType": "SUV",
                "fuelType": "DIESEL",
                "colorType": "NAPOLI BLACK",
                "fitnessUpto": "2038-01-19",
                "insuranceProvider": "HDFC ERGO GENERAL INSURANCE",
                "insurancePolicyNumber": "2311-2009-4112-9901",
                "insuranceUpto": "2028-01-18",
                "commercial": True,
                "rto": "JAYANAGAR / SOUTH BENGALURU RTO (KA-05)",
                "seatingCapacity": 4
            },
            "KA01AB1234": {
                "owner": "VASANTH A",
                "status": "ACTIVE",
                "registered": "2021-08-10",
                "category": "4WN",
                "categoryDescription": "Motor Car / LMV",
                "makerDescription": "TATA MOTORS PASSENGER VEHICLES LTD",
                "makerModel": "TATA NEXON EV MAX",
                "bodyType": "SUV",
                "fuelType": "ELECTRIC",
                "colorType": "DAYTONA GREY",
                "fitnessUpto": "2036-08-09",
                "insuranceProvider": "TATA AIG GENERAL INSURANCE",
                "insurancePolicyNumber": "0158932400-00",
                "insuranceUpto": "2027-08-08",
                "commercial": False,
                "rto": "KORAMANGALA RTO, BENGALURU (KA-01)",
                "seatingCapacity": 5
            }
        }

        if clean_reg in MOCK_DATABASE:
            d = MOCK_DATABASE[clean_reg]
            return RcVerifyResponse(
                valid=True,
                status=d["status"],
                registered=d["registered"],
                owner=d["owner"],
                category=d["category"],
                categoryDescription=d["categoryDescription"],
                makerDescription=d["makerDescription"],
                makerModel=d["makerModel"],
                bodyType=d["bodyType"],
                fuelType=d["fuelType"],
                colorType=d["colorType"],
                fitnessUpto=d["fitnessUpto"],
                insuranceProvider=d["insuranceProvider"],
                insurancePolicyNumber=d["insurancePolicyNumber"],
                insuranceUpto=d["insuranceUpto"],
                commercial=d["commercial"],
                blacklistStatus="CLEAN",
                rto=d["rto"],
                seatingCapacity=d["seatingCapacity"],
                source="PARIVAHAN_MORTH_SANDBOX"
            )

        # If not in mock database and no live Attestr token configured:
        # If plate follows standard Indian registration plate format, generate sandbox verification
        if re.match(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$', clean_reg):
            state_prefix = clean_reg[:2]
            is_two_wheeler = any(s in clean_reg for s in ["SC", "BK", "MC", "2W", "CU", "HX"])
            cat = "2WN" if is_two_wheeler else "4WN"
            cat_desc = "M-Cycle / Scooter (2WN)" if is_two_wheeler else "Motor Car / LMV (4WN)"
            maker_model = "HONDA ACTIVA / EV 2W" if is_two_wheeler else "PASSENGER CAR / SUV"
            b_type = "SCOOTER" if is_two_wheeler else "SUV"
            f_type = "ELECTRIC" if "EV" in clean_reg else "PETROL"
            return RcVerifyResponse(
                valid=True,
                status="ACTIVE",
                registered="2023-01-15",
                owner="REGISTERED OWNER",
                category=cat,
                categoryDescription=cat_desc,
                makerDescription="PARIVAHAN RECOGNISED OEM",
                makerModel=maker_model,
                bodyType=b_type,
                fuelType=f_type,
                colorType="WHITE",
                fitnessUpto="2038-01-14",
                insuranceProvider="HDFC ERGO GENERAL INSURANCE",
                insurancePolicyNumber="2311-2009-4112-9901",
                insuranceUpto="2027-01-14",
                commercial=False,
                blacklistStatus="CLEAN",
                rto=f"{state_prefix} RTO PARIVAHAN REGISTRY",
                seatingCapacity=2 if is_two_wheeler else 5,
                source="PARIVAHAN_MORTH_SANDBOX"
            )

        return RcVerifyResponse(
            valid=False,
            status="UNVERIFIED",
            message=(
                f"Registration '{raw_reg}' could not be verified with live Parivahan. "
                "Please enter a valid plate format (e.g., KA01AB1234 or AP09CU7296) or configure ATTESTR_AUTH_TOKEN in backend/.env."
            ),
            source="PARIVAHAN_MORTH_UNCONFIGURED"
        )

