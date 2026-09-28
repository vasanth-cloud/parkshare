import sys
import os
from datetime import datetime, timedelta, timezone

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, Base, engine, run_migrations
from app.core.security import hash_password
from app.models.user import User, UserRole, UserRoleEnum, HostProfile, Vehicle, VehicleTypeEnum
from app.models.listing import ParkingListing, ParkingListingImage, ParkingAvailability, PricingRule, ParkingTypeEnum, ListingStatusEnum, BookingModeEnum
from app.models.booking import Booking, BookingStatusEnum, ParkingSession, VerificationMethodEnum
from app.models.payment import Payment, PaymentStatusEnum, PaymentProviderEnum

def seed_db():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()

    try:
        # 1. Admin User
        admin = db.query(User).filter(User.email == "admin@parkshare.com").first()
        if not admin:
            print("Creating Admin account: admin@parkshare.com / Admin@123")
            admin = User(
                email="admin@parkshare.com",
                hashed_password=hash_password("Admin@123"),
                full_name="Platform Administrator",
                phone_number="+91 9876543210",
                is_active=True,
                is_verified=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            db.add(UserRole(user_id=admin.id, role=UserRoleEnum.ADMIN))
            db.commit()

        # 2. Host User
        host_user = db.query(User).filter(User.email == "host@parkshare.com").first()
        if not host_user:
            print("Creating Host account: host@parkshare.com / Host@123")
            host_user = User(
                email="host@parkshare.com",
                hashed_password=hash_password("Host@123"),
                full_name="Rajesh Sharma (Host)",
                phone_number="+91 9123456789",
                is_active=True,
                is_verified=True
            )
            db.add(host_user)
            db.commit()
            db.refresh(host_user)

            db.add(UserRole(user_id=host_user.id, role=UserRoleEnum.HOST))
            db.add(UserRole(user_id=host_user.id, role=UserRoleEnum.PARKER))
            
            host_profile = HostProfile(
                user_id=host_user.id,
                business_name="Rajesh Private Driveways",
                bio="Providing secure covered driveway parking near Forum Mall Koramangala.",
                payout_upi_id="rajesh@upi",
                is_identity_verified=True
            )
            db.add(host_profile)
            db.commit()
            db.refresh(host_profile)
        else:
            host_profile = db.query(HostProfile).filter(HostProfile.user_id == host_user.id).first()

        # 3. Parker User
        parker = db.query(User).filter(User.email == "parker@parkshare.com").first()
        if not parker:
            print("Creating Parker account: parker@parkshare.com / Parker@123")
            parker = User(
                email="parker@parkshare.com",
                hashed_password=hash_password("Parker@123"),
                full_name="Ananya Kumar (Driver)",
                phone_number="+91 9988776655",
                is_active=True,
                is_verified=True
            )
            db.add(parker)
            db.commit()
            db.refresh(parker)
            db.add(UserRole(user_id=parker.id, role=UserRoleEnum.PARKER))

            # Add Parker Vehicle
            vehicle = Vehicle(
                user_id=parker.id,
                registration_number="TN38AB1234",
                vehicle_type=VehicleTypeEnum.CAR,
                make="Hyundai",
                model="i20",
                color="Silver",
                is_default=True
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)
        else:
            vehicle = db.query(Vehicle).filter(Vehicle.user_id == parker.id).first()
            if not vehicle:
                vehicle = Vehicle(
                    user_id=parker.id,
                    registration_number="TN38AB1234",
                    vehicle_type=VehicleTypeEnum.CAR,
                    make="Hyundai",
                    model="i20",
                    color="Silver",
                    is_default=True
                )
                db.add(vehicle)
                db.commit()
                db.refresh(vehicle)

        # 4. Sample Parking Listings
        listing_1 = db.query(ParkingListing).filter(ParkingListing.title == "Covered Villa Driveway near Forum Mall").first()
        if not listing_1 and host_profile:
            print("Creating Sample Parking Listing 1 (Koramangala)...")
            listing_1 = ParkingListing(
                host_profile_id=host_profile.id,
                title="Covered Villa Driveway near Forum Mall",
                description="Spacious covered private driveway with 24/7 CCTV surveillance and EV charging plug. 2 mins walk to Forum Mall Koramangala.",
                parking_type=ParkingTypeEnum.DRIVEWAY,
                exact_address="House #142, 5th Main Rd, Koramangala 4th Block",
                area="Koramangala",
                city="Bengaluru",
                state="Karnataka",
                pincode="560034",
                latitude=12.9345,
                longitude=77.6101,
                access_instructions="Gate has white pillars. Ring doorbell if gate is latched. Space is reserved on right side.",
                capacity=2,
                dimensions_description="16ft x 9ft",
                is_covered=True,
                is_indoor=False,
                has_cctv=True,
                has_ev_charging=True,
                has_disabled_access=True,
                allowed_vehicle_types=["CAR", "SUV", "BIKE"],
                booking_mode=BookingModeEnum.INSTANT,
                status=ListingStatusEnum.ACTIVE,
                average_rating=4.9,
                total_reviews=12
            )
            db.add(listing_1)
            db.commit()
            db.refresh(listing_1)

            # Pricing rule
            pricing_1 = PricingRule(
                listing_id=listing_1.id,
                hourly_price=35.0,
                daily_price=220.0,
                monthly_price=3500.0,
                minimum_duration_hours=1,
                maximum_duration_hours=168
            )
            db.add(pricing_1)

            # Image
            img_1 = ParkingListingImage(
                listing_id=listing_1.id,
                image_url="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop",
                caption="Front driveway view",
                is_cover=True
            )
            db.add(img_1)

            # Availability (Everyday)
            avail_1 = ParkingAvailability(
                listing_id=listing_1.id,
                day_of_week=-1,
                start_time="00:00",
                end_time="23:59",
                is_available=True
            )
            db.add(avail_1)
            db.commit()

        listing_2 = db.query(ParkingListing).filter(ParkingListing.title == "Apartment Basement Parking Spot - 100ft Road").first()
        if not listing_2 and host_profile:
            print("Creating Sample Parking Listing 2 (Indiranagar)...")
            listing_2 = ParkingListing(
                host_profile_id=host_profile.id,
                title="Apartment Basement Parking Spot - 100ft Road",
                description="Secure basement parking spot inside gated luxury apartment complex. Security guard on duty 24/7.",
                parking_type=ParkingTypeEnum.APARTMENT_PARKING,
                exact_address="Flat B-302, Palm Heights, 100 Feet Rd, Indiranagar",
                area="Indiranagar",
                city="Bengaluru",
                state="Karnataka",
                pincode="560038",
                latitude=12.9784,
                longitude=77.6408,
                access_instructions="Inform security at gate that you have a ParkShare booking for Slot B-12.",
                capacity=1,
                dimensions_description="18ft x 10ft",
                is_covered=True,
                is_indoor=True,
                has_cctv=True,
                has_ev_charging=False,
                has_disabled_access=True,
                allowed_vehicle_types=["CAR", "SUV"],
                booking_mode=BookingModeEnum.INSTANT,
                status=ListingStatusEnum.ACTIVE,
                average_rating=4.8,
                total_reviews=8
            )
            db.add(listing_2)
            db.commit()
            db.refresh(listing_2)

            pricing_2 = PricingRule(
                listing_id=listing_2.id,
                hourly_price=40.0,
                daily_price=250.0,
                monthly_price=4000.0
            )
            db.add(pricing_2)

            img_2 = ParkingListingImage(
                listing_id=listing_2.id,
                image_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop",
                caption="Basement parking bay",
                is_cover=True
            )
            db.add(img_2)
            db.commit()

        # 5. Sample Booking & Session
        existing_booking = db.query(Booking).filter(Booking.booking_reference == "PKR-849201").first()
        if not existing_booking and listing_1 and vehicle and parker:
            print("Creating Sample Confirmed Booking & Active Session...")
            now = datetime.now(timezone.utc)
            booking = Booking(
                booking_reference="PKR-849201",
                user_id=parker.id,
                listing_id=listing_1.id,
                vehicle_id=vehicle.id,
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=3),
                verification_code="7392",
                qr_token="qr-sample-token-849201",
                parking_fee=140.0,
                platform_fee=14.0,
                tax=7.7,
                total_amount=161.7,
                status=BookingStatusEnum.ACTIVE
            )
            db.add(booking)
            db.commit()
            db.refresh(booking)

            payment = Payment(
                booking_id=booking.id,
                order_id="order_ps_849201",
                payment_id="pay_ps_849201",
                provider=PaymentProviderEnum.MOCK,
                amount=161.7,
                status=PaymentStatusEnum.PAID,
                host_gross_earning=140.0,
                platform_commission=14.0,
                tax_collected=7.7
            )
            db.add(payment)

            session = ParkingSession(
                booking_id=booking.id,
                check_in_time=now - timedelta(minutes=50),
                verification_method=VerificationMethodEnum.VERIFICATION_CODE,
                verified_by_user_id=host_user.id
            )
            db.add(session)

            if host_profile:
                host_profile.total_earnings += 140.0

            db.commit()

        print("\nSeed data generated successfully!")
        print("--------------------------------------------------")
        print("Credentials for local testing:")
        print("   Admin Account : admin@parkshare.com / Admin@123")
        print("   Host Account  : host@parkshare.com  / Host@123")
        print("   Parker Account: parker@parkshare.com / Parker@123")
        print("--------------------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
