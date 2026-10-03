import pytest
import uuid
import random
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, Vehicle, HostProfile
from app.models.listing import ParkingListing, ListingStatusEnum
from app.models.booking import Booking, BookingStatusEnum

client = TestClient(app)

def test_full_vehicle_handover_and_release_otp_flow():
    # 1. Login as Parker
    parker_login = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    assert parker_login.status_code == 200
    parker_token = parker_login.json()["access_token"]
    parker_headers = {"Authorization": f"Bearer {parker_token}"}

    # 2. Login as Host
    host_login = client.post("/api/v1/auth/login", json={
        "email": "host@parkshare.com",
        "password": "Host@123"
    })
    assert host_login.status_code == 200
    host_token = host_login.json()["access_token"]
    host_headers = {"Authorization": f"Bearer {host_token}"}

    db = SessionLocal()
    parker = db.query(User).filter(User.email == "parker@parkshare.com").first()
    host_user = db.query(User).filter(User.email == "host@parkshare.com").first()
    listing = db.query(ParkingListing).filter(ParkingListing.host_profile_id == host_user.host_profile.id, ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == parker.id).first()
    listing_id = listing.id
    vehicle_id = vehicle.id
    db.close()

    random_days = random.randint(100, 500)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    start_time = (now + timedelta(hours=1)).isoformat()
    end_time = (now + timedelta(hours=3)).isoformat()

    # Step A: Create and pay for booking -> CONFIRMED
    create_resp = client.post("/api/v1/bookings", headers=parker_headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]

    order_resp = client.post("/api/v1/payments/create-order", headers=parker_headers, json={
        "booking_id": booking_id
    })
    order_id = order_resp.json()["order_id"]

    verify_resp = client.post("/api/v1/payments/verify", headers=parker_headers, json={
        "booking_id": booking_id,
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig_mock"
    })
    assert verify_resp.status_code == 200

    # Step B: Driver arrives at parking location -> DRIVER_ARRIVED
    arrive_resp = client.post(f"/api/v1/bookings/{booking_id}/driver-arrived", headers=parker_headers)
    assert arrive_resp.status_code == 200
    assert arrive_resp.json()["status"] == BookingStatusEnum.DRIVER_ARRIVED
    assert arrive_resp.json()["driver_arrived_at"] is not None

    # Step C: Driver captures Odometer/KM photo & optional exterior photos
    odometer_resp = client.post(f"/api/v1/bookings/{booking_id}/submit-odometer", headers=parker_headers, json={
        "odometer_photo_url": "/uploads/odometer_test_42381.jpg",
        "odometer_reading": 42381.0,
        "odometer_ocr_text": "42,381 KM",
        "exterior_photos": {
            "front": "/uploads/front_test.jpg",
            "rear": "/uploads/rear_test.jpg",
            "left": "/uploads/left_test.jpg",
            "right": "/uploads/right_test.jpg"
        },
        "damage_notes": "Small minor scratch on rear bumper."
    })
    assert odometer_resp.status_code == 200
    assert odometer_resp.json()["status"] == BookingStatusEnum.KEY_HANDOVER_PENDING
    assert odometer_resp.json()["odometer_reading"] == 42381.0
    assert odometer_resp.json()["odometer_photo_url"] == "/uploads/odometer_test_42381.jpg"

    # Step D: SECURITY CHECK - Host cannot generate release OTP before collection phase
    early_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/generate-release-otp", headers=host_headers)
    assert early_otp_resp.status_code == 400
    assert "cannot generate the vehicle-release OTP" in early_otp_resp.json()["detail"]

    # Step E: Host confirms key received -> PARKING_ACTIVE
    key_resp = client.post(f"/api/v1/bookings/{booking_id}/confirm-key-received", headers=host_headers)
    assert key_resp.status_code == 200
    assert key_resp.json()["status"] == BookingStatusEnum.PARKING_ACTIVE
    assert key_resp.json()["key_received_at"] is not None

    # Still cannot generate release OTP during active parking
    active_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/generate-release-otp", headers=host_headers)
    assert active_otp_resp.status_code == 400

    # Step F: Driver returns and requests vehicle collection -> VEHICLE_COLLECTION_REQUESTED
    collect_resp = client.post(f"/api/v1/bookings/{booking_id}/request-collection", headers=parker_headers)
    assert collect_resp.status_code == 200
    assert collect_resp.json()["status"] == BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED
    assert collect_resp.json()["collection_requested_at"] is not None

    # Step G: Host can now generate one-time release OTP
    otp_gen_resp = client.post(f"/api/v1/bookings/{booking_id}/generate-release-otp", headers=host_headers)
    assert otp_gen_resp.status_code == 200
    release_otp = otp_gen_resp.json()["release_otp"]
    assert len(release_otp) == 6

    # Verify DB stores hashed OTP, not plain text!
    db = SessionLocal()
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    assert b.release_otp_hash is not None
    assert b.release_otp_hash != release_otp  # HASHED, NEVER PLAIN TEXT!
    db.close()

    # Step H: Driver enters incorrect OTP -> Rate limit increments & failure
    bad_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/verify-release-otp", headers=parker_headers, json={
        "otp": "000000"
    })
    assert bad_otp_resp.status_code == 400
    assert "Incorrect Host OTP" in bad_otp_resp.json()["detail"]

    # Step I: Driver enters correct Host OTP -> Trip completed, vehicle released
    good_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/verify-release-otp", headers=parker_headers, json={
        "otp": release_otp
    })
    assert good_otp_resp.status_code == 200
    assert good_otp_resp.json()["status"] == BookingStatusEnum.COMPLETED
    assert good_otp_resp.json()["vehicle_released_at"] is not None

    # Verify DB has consumed and cleared OTP (one-time use)
    db = SessionLocal()
    b_done = db.query(Booking).filter(Booking.id == booking_id).first()
    assert b_done.release_otp_hash is None
    assert b_done.status == BookingStatusEnum.COMPLETED
    db.close()


def test_end_parking_enforces_owner_otp():
    """
    CRITICAL USER REQUIREMENT TEST:
    'when i give end parking the owner should give otp then only trip ended'
    
    1. Driver clicks End Parking -> status MUST NOT be COMPLETED! It becomes VEHICLE_COLLECTION_REQUESTED.
    2. Owner generates 6-digit release OTP.
    3. If driver provides wrong OTP -> fails.
    4. Driver provides owner's OTP -> trip is ended (COMPLETED).
    """
    # 1. Login
    parker_login = client.post("/api/v1/auth/login", json={"email": "parker@parkshare.com", "password": "Parker@123"})
    parker_headers = {"Authorization": f"Bearer {parker_login.json()['access_token']}"}

    host_login = client.post("/api/v1/auth/login", json={"email": "host@parkshare.com", "password": "Host@123"})
    host_headers = {"Authorization": f"Bearer {host_login.json()['access_token']}"}

    # 2. Create and confirm booking
    db = SessionLocal()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == 12).first()
    if not vehicle:
        vehicle = db.query(Vehicle).first()
    now = datetime.now(timezone.utc) + timedelta(days=999)
    booking = Booking(
        booking_reference=f"PKR-{random.randint(100000, 999999)}",
        user_id=12,
        listing_id=listing.id,
        vehicle_id=vehicle.id,
        start_time=now,
        end_time=now + timedelta(hours=2),
        total_amount=100.0,
        parking_fee=80.0,
        platform_fee=10.0,
        tax=10.0,
        verification_code="1234",
        status=BookingStatusEnum.PARKING_ACTIVE,
        qr_token=f"qr_{uuid.uuid4()}"
    )
    db.add(booking)
    db.commit()
    booking_id = booking.id
    db.close()

    # STEP 1: Driver gives "End Parking" (without OTP)
    # The trip MUST NOT end! Status becomes VEHICLE_COLLECTION_REQUESTED.
    end_req1 = client.post(f"/api/v1/bookings/{booking_id}/end-parking", headers=parker_headers)
    assert end_req1.status_code == 200
    assert end_req1.json()["status"] == BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED
    assert end_req1.json()["status"] != BookingStatusEnum.COMPLETED

    # STEP 2: Space Owner generates release OTP
    gen_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/generate-release-otp", headers=host_headers)
    assert gen_otp_resp.status_code == 200
    owner_otp = gen_otp_resp.json()["release_otp"]
    assert len(owner_otp) == 6

    # STEP 3: Driver enters wrong OTP -> fails, trip NOT ended
    wrong_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/end-parking", headers=parker_headers, json={"otp": "999999"})
    assert wrong_otp_resp.status_code == 400
    assert "Incorrect Owner OTP" in wrong_otp_resp.json()["detail"]

    # STEP 4: Driver enters correct Owner OTP -> THEN ONLY trip ended!
    correct_otp_resp = client.post(f"/api/v1/bookings/{booking_id}/end-parking", headers=parker_headers, json={"otp": owner_otp})
    assert correct_otp_resp.status_code == 200
    assert correct_otp_resp.json()["status"] == BookingStatusEnum.COMPLETED
    assert correct_otp_resp.json()["vehicle_released_at"] is not None

