import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, Vehicle
from app.models.listing import ParkingListing, ListingStatusEnum
from app.models.booking import Booking, BookingStatusEnum
from app.models.engagement import Review

client = TestClient(app)

def test_review_only_allowed_after_completed_booking():
    """
    Verifies Item 17 requirements:
    1. Uncompleted bookings (e.g. CONFIRMED, ACTIVE) CANNOT be reviewed -> HTTP 400.
    2. Completed bookings can be reviewed -> HTTP 201.
    3. Exactly ONE review per booking is permitted (duplicate review attempt -> HTTP 400).
    4. Listing total_reviews and average_rating update accurately.
    """
    # 1. Login as Parker
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
    vehicle = db.query(Vehicle).first()
    db.close()

    assert listing is not None
    assert vehicle is not None

    # 3. Create a new booking
    start_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    end_time = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()

    book_resp = client.post("/api/v1/bookings", headers=headers, json={
        "listing_id": listing.id,
        "vehicle_id": vehicle.id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert book_resp.status_code == 201
    booking_id = book_resp.json()["id"]

    # 4. Attempt to review BEFORE completing (status is PENDING_PAYMENT or CONFIRMED)
    review_resp_fail = client.post("/api/v1/reviews", headers=headers, json={
        "booking_id": booking_id,
        "rating": 5,
        "comment": "Too early review!"
    })
    assert review_resp_fail.status_code == 400
    assert "completed" in review_resp_fail.json()["detail"].lower()

    # 5. Move booking to COMPLETED state (Simulate Check-in & Check-out completion)
    db = SessionLocal()
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    b.status = BookingStatusEnum.COMPLETED
    db.commit()
    db.close()

    # 6. Review COMPLETED booking -> Should succeed (HTTP 201)
    review_resp_success = client.post("/api/v1/reviews", headers=headers, json={
        "booking_id": booking_id,
        "rating": 5,
        "comment": "Excellent driveway space, seamless parking!"
    })
    assert review_resp_success.status_code == 201
    rev_data = review_resp_success.json()
    assert rev_data["rating"] == 5
    assert rev_data["booking_id"] == booking_id

    # 7. Attempt DUPLICATE review for the same booking -> Should fail (HTTP 400)
    review_resp_duplicate = client.post("/api/v1/reviews", headers=headers, json={
        "booking_id": booking_id,
        "rating": 4,
        "comment": "Trying to review twice!"
    })
    assert review_resp_duplicate.status_code == 400
    assert "already submitted" in review_resp_duplicate.json()["detail"].lower()

    # 8. Verify listing rating was updated
    db = SessionLocal()
    updated_listing = db.query(ParkingListing).filter(ParkingListing.id == listing.id).first()
    assert updated_listing.total_reviews >= 1
    assert updated_listing.average_rating > 0
    db.close()
