import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, HostProfile
from app.models.listing import ParkingListing, ListingStatusEnum, ParkingTypeEnum, BookingModeEnum

client = TestClient(app)

def test_create_and_get_listing_with_dimensions_and_rules():
    """
    Tests creating a parking space listing with vehicle clearance dimensions,
    24/7 access, gated access, security guard, and parking rules.
    """
    # Login as Host
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "host@parkshare.com",
        "password": "Host@123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Prime Indiranagar SUV Space",
        "description": "Spacious covered driveway suitable for large vehicles",
        "parking_type": "DRIVEWAY",
        "exact_address": "100 Feet Road, Indiranagar, Bengaluru",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "access_instructions": "Gate code is 4321",
        "capacity": 1,
        "max_length_m": 5.2,
        "max_width_m": 2.3,
        "max_height_m": 2.1,
        "is_covered": True,
        "is_indoor": False,
        "has_cctv": True,
        "has_ev_charging": False,
        "has_disabled_access": True,
        "has_24_7_access": True,
        "has_gated_access": True,
        "has_security_guard": True,
        "allowed_vehicle_types": ["CAR", "SUV"],
        "parking_rules": "Reverse parking mandatory. No commercial vehicle dumping. Keep gate locked.",
        "booking_mode": "INSTANT",
        "pricing_rule": {
            "hourly_price": 75.0,
            "daily_price": 500.0,
            "monthly_price": 8000.0,
            "minimum_duration_hours": 1,
            "maximum_duration_hours": 24,
            "security_deposit": 0.0
        },
        "availabilities": [
            {
                "day_of_week": -1,
                "start_time": "00:00",
                "end_time": "23:59",
                "is_available": True
            }
        ]
    }

    create_resp = client.post("/api/v1/listings/", headers=headers, json=payload)
    assert create_resp.status_code == 201, create_resp.text
    created_listing = create_resp.json()
    assert created_listing["title"] == "Prime Indiranagar SUV Space"
    assert created_listing["max_length_m"] == 5.2
    assert created_listing["max_width_m"] == 2.3
    assert created_listing["max_height_m"] == 2.1
    assert created_listing["has_24_7_access"] is True
    assert created_listing["has_gated_access"] is True
    assert created_listing["has_security_guard"] is True
    assert created_listing["parking_rules"] == "Reverse parking mandatory. No commercial vehicle dumping. Keep gate locked."

    listing_id = created_listing["id"]

    # Fetch listing by ID (public API)
    get_resp = client.get(f"/api/v1/listings/{listing_id}")
    assert get_resp.status_code == 200
    listing_data = get_resp.json()
    assert listing_data["max_length_m"] == 5.2
    assert listing_data["max_width_m"] == 2.3
    assert listing_data["max_height_m"] == 2.1
    assert listing_data["has_24_7_access"] is True
    assert listing_data["has_gated_access"] is True
    assert listing_data["has_security_guard"] is True
    assert listing_data["parking_rules"] == "Reverse parking mandatory. No commercial vehicle dumping. Keep gate locked."
