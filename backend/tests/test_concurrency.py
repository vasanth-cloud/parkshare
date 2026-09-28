import pytest
import uuid
import random
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, Vehicle
from app.models.listing import ParkingListing, ListingStatusEnum

client = TestClient(app)

def test_concurrent_overlapping_bookings_race_condition():
    """
    Simulates Customer A (10:00 -> 12:00) and Customer B (11:00 -> 13:00)
    attempting to reserve the exact same 1-space driveway concurrently.
    Verifies that pessimistic row locking (SELECT FOR UPDATE) guarantees
    ONLY ONE customer succeeds (HTTP 201) while the overlapping customer
    gets safely rejected with HTTP 409 Conflict.
    """
    # 1. Login as Parker to get auth token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "parker@parkshare.com",
        "password": "Parker@123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get active listing & vehicle
    db = SessionLocal()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    assert listing is not None, "Active listing required for test"
    listing.capacity = 1
    db.commit()
    listing_id = listing.id
    vehicle = db.query(Vehicle).first()
    assert vehicle is not None, "Vehicle required for test"
    vehicle_id = vehicle.id
    db.close()

    # Set up overlapping time windows for a unique day offset
    random_days = random.randint(15000, 30000)
    base_time = datetime.now(timezone.utc) + timedelta(days=random_days)

    # Customer A: 10:00 -> 12:00
    customer_a_start = (base_time + timedelta(hours=10)).isoformat()
    customer_a_end = (base_time + timedelta(hours=12)).isoformat()

    # Customer B: 11:00 -> 13:00 (OVERLAPS Customer A!)
    customer_b_start = (base_time + timedelta(hours=11)).isoformat()
    customer_b_end = (base_time + timedelta(hours=13)).isoformat()

    def attempt_booking(start_time, end_time):
        return client.post("/api/v1/bookings", headers=headers, json={
            "listing_id": listing_id,
            "vehicle_id": vehicle_id,
            "start_time": start_time,
            "end_time": end_time
        })

    # Execute concurrent requests using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(attempt_booking, customer_a_start, customer_a_end)
        future_b = executor.submit(attempt_booking, customer_b_start, customer_b_end)

        res_a = future_a.result()
        res_b = future_b.result()

    statuses = [res_a.status_code, res_b.status_code]
    print(f"Concurrent execution statuses: {statuses}")

    # VERIFICATION:
    # Exactly one request MUST succeed (201 Created)
    # Exactly one request MUST be rejected due to overlap (409 Conflict)
    assert 201 in statuses, "One booking must succeed"
    assert 409 in statuses, "Overlapping booking must be rejected with 409 Conflict"

    rejected_res = res_a if res_a.status_code == 409 else res_b
    assert "fully reserved" in rejected_res.json()["detail"].lower() or "already reserved" in rejected_res.json()["detail"].lower()
