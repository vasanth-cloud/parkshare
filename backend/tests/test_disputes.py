import pytest
import uuid
import random
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.listing import ParkingListing, ListingStatusEnum
from app.models.user import Vehicle

client = TestClient(app)

def test_dispute_report_system_flow():
    # 1. Login Parker & Host & Admin
    parker_login = client.post("/api/v1/auth/login", json={"email": "parker@parkshare.com", "password": "Parker@123"})
    parker_headers = {"Authorization": f"Bearer {parker_login.json()['access_token']}"}

    host_login = client.post("/api/v1/auth/login", json={"email": "host@parkshare.com", "password": "Host@123"})
    host_headers = {"Authorization": f"Bearer {host_login.json()['access_token']}"}

    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@parkshare.com", "password": "Admin@123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Setup listing capacity
    db = SessionLocal()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    listing.capacity = 100
    db.commit()
    listing_id = listing.id
    db.close()

    veh_resp = client.get("/api/v1/vehicles", headers=parker_headers)
    vehicle_id = veh_resp.json()[0]["id"]

    now = datetime.now(timezone.utc) + timedelta(days=random.randint(1200, 1800))
    start_time = (now + timedelta(hours=1)).isoformat()
    end_time = (now + timedelta(hours=3)).isoformat()

    create_b = client.post("/api/v1/bookings", headers=parker_headers, json={
        "listing_id": listing_id,
        "vehicle_id": vehicle_id,
        "start_time": start_time,
        "end_time": end_time
    })
    assert create_b.status_code == 201
    booking_id = create_b.json()["id"]

    # 2. Customer files dispute: SPACE_UNAVAILABLE
    cust_disp = client.post("/api/v1/disputes", headers=parker_headers, json={
        "booking_id": booking_id,
        "category": "SPACE_UNAVAILABLE",
        "description": "Host gate was locked and space was occupied by another vehicle upon arrival."
    })
    assert cust_disp.status_code == 201, cust_disp.text
    c_data = cust_disp.json()
    assert c_data["reporter_role"] == "PARKER"
    assert c_data["category"] == "SPACE_UNAVAILABLE"
    assert c_data["status"] == "OPEN"
    disp_id = c_data["id"]

    # 3. Host files dispute: WRONG_VEHICLE
    host_disp = client.post("/api/v1/disputes", headers=host_headers, json={
        "booking_id": booking_id,
        "category": "WRONG_VEHICLE",
        "description": "Customer arrived in a large commercial truck exceeding driveway dimensions."
    })
    assert host_disp.status_code == 201, host_disp.text
    h_data = host_disp.json()
    assert h_data["reporter_role"] == "HOST"
    assert h_data["category"] == "WRONG_VEHICLE"

    # 4. Customer views their filed disputes
    my_disp = client.get("/api/v1/disputes/my", headers=parker_headers)
    assert my_disp.status_code == 200
    assert len(my_disp.json()) >= 1

    # 5. Admin lists disputes & resolves customer dispute
    admin_dispes = client.get("/api/v1/admin/disputes?status=OPEN", headers=admin_headers)
    assert admin_dispes.status_code == 200
    assert len(admin_dispes.json()) >= 1

    resolve_res = client.post(f"/api/v1/admin/disputes/{disp_id}/resolve", headers=admin_headers, json={
        "status": "RESOLVED",
        "resolution_notes": "Verified host absence. Issued 100% full refund to customer and issued warning to host."
    })
    assert resolve_res.status_code == 200, resolve_res.text
    r_data = resolve_res.json()
    assert r_data["status"] == "RESOLVED"
    assert "full refund" in r_data["resolution_notes"].lower()

