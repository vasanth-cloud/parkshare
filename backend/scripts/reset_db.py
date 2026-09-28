import sys
import os

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, Base, engine, run_migrations
import app.models
from app.core.security import hash_password
from app.models.user import User, UserRole, UserRoleEnum, HostProfile

def reset_db():
    print("Dropping all existing database tables and wiping all dummy data...")
    Base.metadata.drop_all(bind=engine)
    
    print("Re-creating clean database schema...")
    Base.metadata.create_all(bind=engine)
    run_migrations()
    
    db = SessionLocal()
    try:
        print("Initializing clean default user accounts (Zero dummy listings / bookings)...")

        # 1. Admin Account
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

        # 2. Host Account (Clean slate - 0 listings)
        host_user = User(
            email="host@parkshare.com",
            hashed_password=hash_password("Host@123"),
            full_name="Ravi Sharma",
            phone_number="+91 9876543210",
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
            business_name="Ravi Private Spaces",
            bio="Verified host ready to list private driveway & garage parking spaces.",
            payout_upi_id="ravi@upi",
            is_identity_verified=True
        )
        db.add(host_profile)
        db.commit()

        # 3. Parker Account (Clean slate - 0 bookings, 0 vehicles)
        parker = User(
            email="parker@parkshare.com",
            hashed_password=hash_password("Parker@123"),
            full_name="Ananya Kumar",
            phone_number="+91 9988776655",
            is_active=True,
            is_verified=True
        )
        db.add(parker)
        db.commit()
        db.refresh(parker)
        db.add(UserRole(user_id=parker.id, role=UserRoleEnum.PARKER))
        db.commit()

        print("\nDatabase reset complete! All dummy spaces, bookings, disputes, and reviews have been deleted.")
        print("--------------------------------------------------")
        print("You can now create listings and bookings from scratch!")
        print("Clean Test Accounts:")
        print("   - Admin   : admin@parkshare.com / Admin@123")
        print("   - Host    : host@parkshare.com  / Host@123")
        print("   - Customer: parker@parkshare.com / Parker@123")
        print("--------------------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error resetting database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
