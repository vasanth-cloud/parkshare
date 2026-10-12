import json
import os
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.models.listing import ParkingListing, ParkingListingImage, ParkingAvailability, PricingRule
from app.models.booking import Booking

def backup_and_clear():
    db = SessionLocal()
    try:
        listings = db.query(ParkingListing).all()
        print(f"Current listings count: {len(listings)}")

        backup_data = []
        for l in listings:
            backup_data.append({
                "id": l.id,
                "title": l.title,
                "description": l.description,
                "parking_type": str(l.parking_type),
                "exact_address": l.exact_address,
                "area": l.area,
                "city": l.city,
                "state": l.state,
                "pincode": l.pincode,
                "latitude": l.latitude,
                "longitude": l.longitude,
                "created_at": str(l.created_at),
                "host_profile_id": l.host_profile_id,
            })

        backup_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(backup_dir, exist_ok=True)
        backup_file = os.path.join(backup_dir, f"backup_spaces_{int(datetime.now().timestamp())}.json")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, indent=2)
        print(f"Safety backup saved to: {backup_file}")

        # Delete all listings (cascade deletes linked availabilities, images, pricing rules, reviews, bookings, etc.)
        for l in listings:
            db.delete(l)

        db.commit()

        remaining_listings = db.query(ParkingListing).count()
        remaining_bookings = db.query(Booking).count()
        print(f"Cleanup successful! Remaining listings: {remaining_listings}, Remaining bookings: {remaining_bookings}")
        return True
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    backup_and_clear()
