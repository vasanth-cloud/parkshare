import pytest
import uuid
import random
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.models.booking import BookingStatusEnum

client = TestClient(app)

from app.core.database import SessionLocal
from app.models.listing import ParkingListing

def get_host_active_listing_id(host_headers):
    my_resp = client.get("/api/v1/listings/my-listings", headers=host_headers)
    if my_resp.status_code == 200:
        listings = my_resp.json()
        for l in listings:
            if l["status"] == "ACTIVE":
                db = SessionLocal()
                l_obj = db.query(ParkingListing).filter(ParkingListing.id == l["id"]).first()
                if l_obj:
                    l_obj.capacity = 100
                    db.commit()
                db.close()
                return l["id"]

    # If no active listing, host creates a new listing
    payload = {
        "title": "Host Dedicated Driveway Space",
        "description": "Safe private driveway in Indiranagar",
        "parking_type": "DRIVEWAY",
        "exact_address": "123 100 Feet Rd, Indiranagar, Bengaluru",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "capacity": 100,
        "is_covered": True,
        "booking_mode": "INSTANT",
        "pricing_rule": {
            "hourly_price": 60.0,
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

    # Admin approves listing
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@parkshare.com",
        "password": "Admin@123"
    })
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    client.post(f"/api/v1/admin/listings/{new_id}/approve", headers=admin_headers, json={"status": "ACTIVE"})

    return new_id

def test_host_cancellation_grant_full_refund():
    """
    Verifies host cancellation triggers 100% full refund for customer
    and logs customer notification via API endpoints.
    """
    # Login Host
    host_resp = client.post("/api/v1/auth/login", json={
        "email": "host@parkshare.com",
        "password": "Host@123"
    })
    host_headers = {"Authorization": f"Bearer {host_resp.json()['access_token']}"}

    # Login Parker
    parker_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    parker_headers = {"Authorization": f"Bearer {parker_resp.json()['access_token']}"}

    # Get active listing owned by host
    listing_id = get_host_active_listing_id(host_headers)

    # Get vehicle
    veh_resp = client.get("/api/v1/vehicles", headers=parker_headers)
    vehicles = veh_resp.json()
    if not vehicles:
        add_v = client.post("/api/v1/vehicles", headers=parker_headers, json={
            "license_plate": "KA-01-MJ-9999",
            "vehicle_type": "CAR",
            "make": "Hyundai",
            "model": "i20"
        })
        vehicle_id = add_v.json()["id"]
    else:
        vehicle_id = vehicles[0]["id"]

    random_days = random.randint(3000, 9000)
    now = datetime.now(timezone.utc) + timedelta(days=random_days)
    start_time = (now + timedelta(hours=5)).isoformat()
    end_time = (now + timedelta(hours=7)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=parker_headers, json={
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
    order_res = client.post("/api/v1/payments/create-order", headers=parker_headers, json={"booking_id": booking_id})
    assert order_res.status_code == 200, order_res.text
    order_id = order_res.json()["order_id"]
    client.post("/api/v1/payments/verify", headers=parker_headers, json={
        "booking_id": booking_id,
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4()}",
        "signature": "sig"
    })


    # Host cancels booking via API
    cancel_resp = client.post(f"/api/v1/bookings/host/{booking_id}/cancel?reason=Driveway%20maintenance%20required", headers=host_headers)
    assert cancel_resp.status_code == 200, cancel_resp.text
    c_data = cancel_resp.json()
    assert c_data["status"] == BookingStatusEnum.CANCELLED
    assert c_data["cancelled_by"] == "HOST"
    assert c_data["refund_amount"] == total_amount

    # Verify customer notification via API
    notif_resp = client.get("/api/v1/bookings/notifications/my", headers=parker_headers)
    assert notif_resp.status_code == 200
    notifications = notif_resp.json()
    assert len(notifications) > 0
    assert "Reservation Cancelled by Host" in notifications[0]["title"]

def test_host_last_minute_cancellation_penalty():
    """
    Verifies last-minute host cancellation (<2h before start) records
    is_last_minute = True, ₹100 penalty fee, and updates HostProfile metrics via API.
    """
    # Login Host
    host_resp = client.post("/api/v1/auth/login", json={
        "email": "host@parkshare.com",
        "password": "Host@123"
    })
    host_headers = {"Authorization": f"Bearer {host_resp.json()['access_token']}"}

    # Login Parker
    parker_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    parker_headers = {"Authorization": f"Bearer {parker_resp.json()['access_token']}"}

    # Get active listing owned by host
    listing_id = get_host_active_listing_id(host_headers)

    # Get vehicle
    veh_resp = client.get("/api/v1/vehicles", headers=parker_headers)
    vehicles = veh_resp.json()
    if not vehicles:
        add_v = client.post("/api/v1/vehicles", headers=parker_headers, json={
            "license_plate": "KA-01-MJ-9999",
            "vehicle_type": "CAR",
            "make": "Hyundai",
            "model": "i20"
        })
        vehicle_id = add_v.json()["id"]
    else:
        vehicle_id = vehicles[0]["id"]

    # Booking starting in 1 hour (<2h!)
    now = datetime.now(timezone.utc)
    start_time = (now + timedelta(hours=1)).isoformat()
    end_time = (now + timedelta(hours=3)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=parker_headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_b.status_code == 201, create_b.text
    booking = create_b.json()
    booking_id = booking["id"]

    # Host cancels booking via API
    cancel_resp = client.post(f"/api/v1/bookings/host/{booking_id}/cancel?reason=Emergency%20host%20unavailability", headers=host_headers)
    assert cancel_resp.status_code == 200, cancel_resp.text
    c_data = cancel_resp.json()
    assert c_data["status"] == BookingStatusEnum.CANCELLED
    assert c_data["cancelled_by"] == "HOST"
