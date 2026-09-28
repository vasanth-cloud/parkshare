import pytest
import uuid
import random
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, Vehicle, HostProfile
from app.models.listing import ParkingListing, ListingStatusEnum
from app.models.booking import Booking, BookingStatusEnum
from app.services.booking_service import BookingService
from app.services.session_service import SessionService
from app.services.payment_service import PaymentService

client = TestClient(app)

def test_state_machine_valid_full_lifecycle():
    """
    Tests PENDING_PAYMENT -> CONFIRMED -> ACTIVE -> COMPLETED
    """
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    parker = db.query(User).filter(User.email == "parker@parkshare.com").first()
    host_user = db.query(User).filter(User.email == "host@parkshare.com").first()
    listing = db.query(ParkingListing).filter(ParkingListing.host_profile_id == host_user.host_profile.id, ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == parker.id).first()
    listing_id = listing.id
    vehicle_id = vehicle.id
    host_user_id = host_user.id
    db.commit()
    db.close()

    import random
    random_days = random.randint(1000, 10000)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    start_time = (now + timedelta(hours=1)).isoformat()
    end_time = (now + timedelta(hours=3)).isoformat()

    # 1. Create booking -> PENDING_PAYMENT
    resp = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert resp.status_code == 201
    booking_data = resp.json()
    assert booking_data["status"] == BookingStatusEnum.PENDING_PAYMENT

    # 2. Payment -> CONFIRMED
    order_resp = client.post("/api/v1/payments/create-order", headers=headers, json={
        "booking_id": booking_data["id"]
    })
    order_id = order_resp.json()["order_id"]

    verify_resp = client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": booking_data["id"],
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig_mock"
    })
    assert verify_resp.status_code == 200

    db = SessionLocal()
    b = db.query(Booking).filter(Booking.id == booking_data["id"]).first()
    assert b.status == BookingStatusEnum.CONFIRMED

    # 3. Host Check-in -> ACTIVE
    session = SessionService.check_in(db, host_user_id=host_user_id, qr_token=b.qr_token)
    assert b.status == BookingStatusEnum.ACTIVE

    # 4. Host Check-out -> COMPLETED
    session_out = SessionService.check_out(db, host_user_id=host_user_id, booking_id=b.id)
    assert b.status == BookingStatusEnum.COMPLETED
    db.commit()
    db.close()

def test_invalid_state_transitions():
    """
    Verifies that illegal status jumps (e.g. COMPLETED -> CANCELLED, EXPIRED -> ACTIVE)
    raise HTTP 400 Bad Request with descriptive transition error message.
    """
    db = SessionLocal()
    
    # Test 1: Directly validate transition exception logic
    with pytest.raises(HTTPException) as exc_info:
        BookingService.validate_transition(BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED)
    assert exc_info.value.status_code == 400
    assert "Invalid status transition" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info:
        BookingService.validate_transition(BookingStatusEnum.EXPIRED, BookingStatusEnum.ACTIVE)
    assert exc_info.value.status_code == 400
    assert "Invalid status transition" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info:
        BookingService.validate_transition(BookingStatusEnum.REFUNDED, BookingStatusEnum.CONFIRMED)
    assert exc_info.value.status_code == 400
    assert "Invalid status transition" in exc_info.value.detail

    db.close()

def test_cancellation_and_refund_flow():
    """
    Tests CONFIRMED -> REFUND_PENDING -> REFUNDED
    """
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    parker = db.query(User).filter(User.email == "parker@parkshare.com").first()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == parker.id).first()
    admin_user = db.query(User).filter(User.email == "admin@parkshare.com").first()
    listing_id = listing.id
    vehicle_id = vehicle.id
    admin_user_id = admin_user.id
    db.commit()
    db.close()

    random_days = random.randint(1000, 10000)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    resp = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": (now + timedelta(hours=1)).isoformat(),
        "end_time": (now + timedelta(hours=3)).isoformat()
    })
    b_id = resp.json()["id"]

    # Confirm booking via payment
    order_id = client.post("/api/v1/payments/create-order", headers=headers, json={"booking_id": b_id}).json()["order_id"]
    client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": b_id,
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig"
    })

    # Request Refund -> REFUND_PENDING
    ref_resp = client.post(f"/api/v1/bookings/{b_id}/request-refund?reason=Change%20of%20plans", headers=headers)
    assert ref_resp.status_code == 200
    assert ref_resp.json()["status"] == BookingStatusEnum.REFUND_PENDING

    # Process Refund via Admin -> REFUNDED
    db = SessionLocal()
    refunded_b = BookingService.process_refund(db, b_id, admin_user_id=admin_user_id)
    assert refunded_b.status == BookingStatusEnum.REFUNDED
    db.commit()
    db.close()

def test_unpaid_expiration():
    """
    Tests PENDING_PAYMENT -> EXPIRED
    """
    db = SessionLocal()
    parker = db.query(User).filter(User.email == "parker@parkshare.com").first()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == parker.id).first()
    host_user = db.query(User).filter(User.email == "host@parkshare.com").first()

    random_days = random.randint(1000, 10000)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    booking = BookingService.create_booking(db, parker.id, type("Data", (), {
        "listing_id": listing.id,
        "vehicle_id": vehicle.id,
        "start_time": now + timedelta(hours=1),
        "end_time": now + timedelta(hours=3)
    }))
    assert booking.status == BookingStatusEnum.PENDING_PAYMENT

    # Expire unpaid booking
    expired_b = BookingService.expire_unpaid_booking(db, booking.id)
    assert expired_b.status == BookingStatusEnum.EXPIRED

    # Cannot check in expired booking -> should fail
    with pytest.raises(HTTPException) as exc:
        SessionService.check_in(db, host_user_id=host_user.id, qr_token=expired_b.qr_token)
    assert exc.value.status_code == 400
    db.commit()
    db.close()
