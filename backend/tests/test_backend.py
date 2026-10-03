import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, Vehicle
from app.models.listing import ParkingListing, ListingStatusEnum
from app.models.booking import Booking

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_user_login():
    response = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_search_listings_privacy():
    response = client.get("/api/v1/listings/search?city=Bengaluru")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    # Verify exact address is MASKED (None) for unconfirmed search
    assert items[0]["exact_address"] is None
    assert items[0]["approximate_address"] is not None

def test_double_booking_prevention():
    # Login as Parker
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get sample ACTIVE listing & vehicle
    db = SessionLocal()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).first()

    assert listing is not None
    assert vehicle is not None
    listing.capacity = 1
    db.commit()
    listing_id = listing.id
    vehicle_id = vehicle.id
    db.close()

    import random
    random_days = random.randint(30000, 50000)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    start_time = (now + timedelta(hours=10)).isoformat()
    end_time = (now + timedelta(hours=14)).isoformat()

    # Book first time -> Should succeed
    resp1 = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })

    if resp1.status_code != 201:
        print("resp1 error detail:", resp1.json())
    assert resp1.status_code == 201
    booking1 = resp1.json()

    # Pay & confirm booking1
    order_resp = client.post("/api/v1/payments/create-order", headers=headers, json={
        "booking_id": booking1["id"]
    })
    assert order_resp.status_code == 200
    order_id = order_resp.json()["order_id"]

    verify_resp = client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": booking1["id"],
        "order_id": order_id,
        "payment_id": f"pay_test_{uuid.uuid4()}",
        "signature": "sig_mock"
    })
    assert verify_resp.status_code == 200

    # Attempt overlapping booking for same time window -> Must be REJECTED (HTTP 409 Conflict)
    resp2 = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": (now + timedelta(hours=11)).isoformat(),  # Overlaps!
        "end_time": (now + timedelta(hours=13)).isoformat()
    })

    assert resp2.status_code == 409
    assert "reserved" in resp2.json()["detail"].lower()

def test_customer_active_parking_and_end_parking():
    """
    Verifies GET /api/v1/bookings/active and POST /api/v1/bookings/{id}/end-parking
    """
    import random
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    db = SessionLocal()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    listing.capacity = 100
    db.commit()
    listing_id = listing.id
    db.close()

    veh_resp = client.get("/api/v1/vehicles", headers=headers)
    vehicle_id = veh_resp.json()[0]["id"]

    now = datetime.now(timezone.utc) + timedelta(days=random.randint(600, 900))
    start_time = (now + timedelta(hours=1)).isoformat()
    end_time = (now + timedelta(hours=3)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_b.status_code == 201
    booking_id = create_b.json()["id"]

    order_res = client.post("/api/v1/payments/create-order", headers=headers, json={"booking_id": booking_id})
    client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": booking_id,
        "order_id": order_res.json()["order_id"],
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig"
    })

    # GET /api/v1/bookings/active
    active_res = client.get("/api/v1/bookings/active", headers=headers)
    assert active_res.status_code == 200
    act_data = active_res.json()
    assert act_data is not None
    assert act_data["id"] == booking_id
    assert act_data["status"] in ["CONFIRMED", "ACTIVE"]

    # End parking Step 1: Driver requests end parking -> transitions to VEHICLE_COLLECTION_REQUESTED
    end_res = client.post(f"/api/v1/bookings/{booking_id}/end-parking", headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "VEHICLE_COLLECTION_REQUESTED"

    # End parking Step 2: Space Owner generates 6-digit release OTP
    host_login = client.post("/api/v1/auth/login", json={"email": "host@parkshare.com", "password": "Host@123"})
    host_headers = {"Authorization": f"Bearer {host_login.json()['access_token']}"}
    otp_res = client.post(f"/api/v1/bookings/{booking_id}/generate-release-otp", headers=host_headers)
    assert otp_res.status_code == 200
    release_otp = otp_res.json()["release_otp"]
    assert len(release_otp) == 6

    # End parking Step 3: Driver enters owner's OTP -> Trip successfully ends with COMPLETED
    end_otp_res = client.post(f"/api/v1/bookings/{booking_id}/end-parking", headers=headers, json={"otp": release_otp})
    assert end_otp_res.status_code == 200
    assert end_otp_res.json()["status"] == "COMPLETED"


