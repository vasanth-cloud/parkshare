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
        print("Initializing clean admin user account...")

        # 1. Admin Account
        admin = User(
            email="avasanth081@gmail.com",
            hashed_password=hash_password("Vasanth@123"),
            full_name="Platform Administrator",
            phone_number="+91 9876543210",
            is_active=True,
            is_verified=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.add(UserRole(user_id=admin.id, role=UserRoleEnum.ADMIN))
        db.add(UserRole(user_id=admin.id, role=UserRoleEnum.HOST))
        db.add(UserRole(user_id=admin.id, role=UserRoleEnum.PARKER))
        db.commit()

        print("\nDatabase reset complete! All dummy spaces, bookings, disputes, and reviews have been deleted.")
        print("--------------------------------------------------")
        print("Clean Admin Account:")
        print("   - Admin   : avasanth081@gmail.com / Vasanth@123")
        print("--------------------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error resetting database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
