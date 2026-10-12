import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User, UserRole, HostProfile, Vehicle
from app.models.listing import ParkingListing, ParkingListingImage, ParkingAvailability, PricingRule
from app.models.booking import Booking, ParkingSession
from app.models.payment import Payment

def remove_dummy_data():
    db = SessionLocal()
    try:
        print("Starting targeted cleanup of dummy seed data...")

        # 1. Find dummy users
        dummy_emails = ["host@parkshare.com", "parker@parkshare.com"]
        dummy_users = db.query(User).filter(User.email.in_(dummy_emails)).all()
        dummy_user_ids = [u.id for u in dummy_users]
        print(f"Found dummy users: {[u.email for u in dummy_users]} (IDs: {dummy_user_ids})")

        # 2. Delete dummy bookings & related payments/sessions
        dummy_bookings = db.query(Booking).filter(
            (Booking.user_id.in_(dummy_user_ids)) | (Booking.booking_reference == "PKR-849201")
        ).all()
        for b in dummy_bookings:
            db.query(Payment).filter(Payment.booking_id == b.id).delete()
            db.query(ParkingSession).filter(ParkingSession.booking_id == b.id).delete()
            db.delete(b)
        print(f"Deleted {len(dummy_bookings)} dummy bookings.")

        # 3. Delete dummy parking listings (seed listings)
        dummy_listing_titles = [
            "Covered Villa Driveway near Forum Mall",
            "Apartment Basement Parking Spot - 100ft Road"
        ]
        dummy_listings = db.query(ParkingListing).filter(
            (ParkingListing.title.in_(dummy_listing_titles)) |
            (ParkingListing.host_profile_id.in_(
                db.query(HostProfile.id).filter(HostProfile.user_id.in_(dummy_user_ids))
            ))
        ).all()
        for l in dummy_listings:
            db.query(ParkingListingImage).filter(ParkingListingImage.listing_id == l.id).delete()
            db.query(ParkingAvailability).filter(ParkingAvailability.listing_id == l.id).delete()
            db.query(PricingRule).filter(PricingRule.listing_id == l.id).delete()
            db.delete(l)
        print(f"Deleted {len(dummy_listings)} dummy parking listings.")

        # 4. Delete dummy vehicles
        dummy_vehicles = db.query(Vehicle).filter(Vehicle.user_id.in_(dummy_user_ids)).all()
        for v in dummy_vehicles:
            db.delete(v)
        print(f"Deleted {len(dummy_vehicles)} dummy vehicles.")

        # 5. Delete dummy host profiles
        dummy_profiles = db.query(HostProfile).filter(HostProfile.user_id.in_(dummy_user_ids)).all()
        for hp in dummy_profiles:
            db.delete(hp)
        print(f"Deleted {len(dummy_profiles)} dummy host profiles.")

        # 6. Delete dummy users and user roles
        for u in dummy_users:
            db.query(UserRole).filter(UserRole.user_id == u.id).delete()
            db.delete(u)
        print(f"Deleted {len(dummy_users)} dummy users.")

        db.commit()
        print("Cleanup committed successfully!")

        # Print remaining active records
        remaining_users = db.query(User).all()
        remaining_listings = db.query(ParkingListing).all()
        print("--------------------------------------------------")
        print("REMAINING REAL USERS IN DATABASE:")
        for u in remaining_users:
            roles = [r.role.value if hasattr(r.role, 'value') else str(r.role) for r in u.roles]
            print(f" - {u.email} ({u.full_name}) -> Roles: {roles}")
        print(f"REMAINING LISTINGS: {len(remaining_listings)}")
        print("--------------------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    remove_dummy_data()
