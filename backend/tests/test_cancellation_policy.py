import pytest
import uuid
import random
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.models.booking import BookingStatusEnum, CancellationTierEnum

client = TestClient(app)

def create_active_test_listing():
    # Login Host
    host_resp = client.post("/api/v1/auth/login", json={
        "email": "host@parkshare.com",
        "password": "Host@123"
    })
    host_headers = {"Authorization": f"Bearer {host_resp.json()['access_token']}"}

    payload = {
        "title": f"Test Policy Space {uuid.uuid4()}",
        "description": "Test cancellation policy space",
        "parking_type": "DRIVEWAY",
        "exact_address": "456 Indiranagar, Bengaluru",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "capacity": 10,
        "is_covered": True,
        "booking_mode": "INSTANT",
        "pricing_rule": {
            "hourly_price": 50.0,
            "minimum_duration_hours": 1,
            "maximum_duration_hours": 24,
            "security_deposit": 0.0
        },
        "availabilities": [
            {"day_of_week": -1, "start_time": "00:00", "end_time": "23:59", "is_available": True}
        ]
    }
    create_l = client.post("/api/v1/listings/", headers=host_headers, json=payload)
    new_id = create_l.json()["id"]

    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@parkshare.com",
        "password": "Admin@123"
    })
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    client.post(f"/api/v1/admin/listings/{new_id}/approve", headers=admin_headers, json={"status": "ACTIVE"})
    return new_id

def get_auth_and_fixtures():
    # Login as Parker
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    listing_id = create_active_test_listing()

    # Get vehicle
    veh_resp = client.get("/api/v1/vehicles", headers=headers)
    vehicles = veh_resp.json()
    if not vehicles:
        add_v = client.post("/api/v1/vehicles", headers=headers, json={
            "license_plate": "KA-01-MJ-9999",
            "vehicle_type": "CAR",
            "make": "Hyundai",
            "model": "i20"
        })
        vehicle_id = add_v.json()["id"]
    else:
        vehicle_id = vehicles[0]["id"]

    return headers, listing_id, vehicle_id

def test_early_cancellation_full_refund():
    """
    Tests cancellation > 2 hours before start_time -> 100% Full Refund
    """
    headers, listing_id, vehicle_id = get_auth_and_fixtures()

    random_days = random.randint(5000, 15000)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    start_time = (now + timedelta(hours=5)).isoformat()
    end_time = (now + timedelta(hours=7)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_b.status_code == 201, create_b.text
    booking = create_b.json()
    booking_id = booking["id"]
    total_amount = booking["total_amount"]

    # Confirm payment
    order_res = client.post("/api/v1/payments/create-order", headers=headers, json={"booking_id": booking_id})
    assert order_res.status_code == 200, order_res.text
    order_id = order_res.json()["order_id"]
    verify_res = client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": booking_id,
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig"
    })
    assert verify_res.status_code == 200, verify_res.text

    # Preview cancellation -> Should show 100% refund
    prev_resp = client.get(f"/api/v1/bookings/{booking_id}/cancellation-preview", headers=headers)
    assert prev_resp.status_code == 200
    p_data = prev_resp.json()
    assert p_data["cancellation_tier"] == CancellationTierEnum.FULL_REFUND
    assert p_data["refund_percentage"] == 100.0
    assert p_data["refund_amount"] == total_amount

    # Execute cancellation
    cancel_resp = client.post(f"/api/v1/bookings/{booking_id}/cancel?reason=Plans%20changed", headers=headers)
    assert cancel_resp.status_code == 200
    c_data = cancel_resp.json()
    assert c_data["status"] == BookingStatusEnum.CANCELLED
    assert c_data["cancellation_tier"] == CancellationTierEnum.FULL_REFUND
    assert c_data["refund_amount"] == total_amount

def test_late_cancellation_partial_refund():
    """
    Tests cancellation < 2 hours before start_time -> 50% Partial Refund
    """
    headers, listing_id, vehicle_id = get_auth_and_fixtures()

    now = datetime.now()
    start_time = (now + timedelta(hours=1)).isoformat()
    end_time = (now + timedelta(hours=3)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_b.status_code == 201, create_b.text
    booking = create_b.json()
    booking_id = booking["id"]
    total_amount = booking["total_amount"]

    # Confirm payment
    order_res = client.post("/api/v1/payments/create-order", headers=headers, json={"booking_id": booking_id})
    assert order_res.status_code == 200, order_res.text
    order_id = order_res.json()["order_id"]
    verify_res = client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": booking_id,
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig"
    })
    assert verify_res.status_code == 200, verify_res.text

    # Preview cancellation -> Should show 50% partial refund
    prev_resp = client.get(f"/api/v1/bookings/{booking_id}/cancellation-preview", headers=headers)
    assert prev_resp.status_code == 200
    p_data = prev_resp.json()
    print("P_DATA:", p_data)
    assert p_data["cancellation_tier"] == CancellationTierEnum.PARTIAL_REFUND

    assert p_data["refund_percentage"] == 50.0
    assert p_data["refund_amount"] == round(total_amount * 0.5, 2)

    # Cancel
    cancel_resp = client.post(f"/api/v1/bookings/{booking_id}/cancel?reason=Running%20late", headers=headers)
    assert cancel_resp.status_code == 200
    c_data = cancel_resp.json()
    assert c_data["status"] == BookingStatusEnum.CANCELLED
    assert c_data["cancellation_tier"] == CancellationTierEnum.PARTIAL_REFUND
    assert c_data["refund_amount"] == round(total_amount * 0.5, 2)

def test_post_start_cancellation_no_refund():
    """
    Tests cancellation after start_time -> 0% Refund
    """
    headers, listing_id, vehicle_id = get_auth_and_fixtures()

    # Create booking starting 10 minutes ago
    now = datetime.now()
    start_time = (now - timedelta(minutes=10)).isoformat()
    end_time = (now + timedelta(hours=2)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_b.status_code == 201, create_b.text
    booking = create_b.json()
    booking_id = booking["id"]

    # Confirm payment
    order_res = client.post("/api/v1/payments/create-order", headers=headers, json={"booking_id": booking_id})
    assert order_res.status_code == 200, order_res.text
    order_id = order_res.json()["order_id"]
    verify_res = client.post("/api/v1/payments/verify", headers=headers, json={
        "booking_id": booking_id,
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig"
    })
    assert verify_res.status_code == 200, verify_res.text

    # Preview cancellation -> Should show 0% refund
    prev_resp = client.get(f"/api/v1/bookings/{booking_id}/cancellation-preview", headers=headers)
    assert prev_resp.status_code == 200
    p_data = prev_resp.json()
    assert p_data["cancellation_tier"] == CancellationTierEnum.NO_REFUND
    assert p_data["refund_percentage"] == 0.0
    assert p_data["refund_amount"] == 0.0

    # Cancel
    cancel_resp = client.post(f"/api/v1/bookings/{booking_id}/cancel?reason=No%20show", headers=headers)
    assert cancel_resp.status_code == 200
    c_data = cancel_resp.json()
    assert c_data["status"] == BookingStatusEnum.CANCELLED
    assert c_data["cancellation_tier"] == CancellationTierEnum.NO_REFUND
    assert c_data["refund_amount"] == 0.0
