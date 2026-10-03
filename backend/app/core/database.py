from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

is_sqlite = db_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_migrations():
    from sqlalchemy import text
    if not is_sqlite:
        enum_values = [
            "BOOKING_CREATED",
            "DRIVER_ARRIVED",
            "ODOMETER_PHOTO_SUBMITTED",
            "KEY_HANDOVER_PENDING",
            "KEY_RECEIVED",
            "PARKING_ACTIVE",
            "VEHICLE_COLLECTION_REQUESTED",
            "RELEASE_OTP_VERIFIED",
            "VEHICLE_RELEASED",
            "DISPUTE_OPENED",
        ]
        try:
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as aconn:
                for val in enum_values:
                    try:
                        aconn.execute(text(f"ALTER TYPE bookingstatusenum ADD VALUE IF NOT EXISTS '{val}'"))
                    except Exception:
                        pass
        except Exception:
            pass

    with engine.connect() as conn:
        statements = [
            # parking_listings
            "ALTER TABLE parking_listings ADD COLUMN host_type VARCHAR(50) DEFAULT 'INDIVIDUAL'",
            "ALTER TABLE parking_listings ADD COLUMN total_spaces INTEGER DEFAULT 1",
            # pricing_rules
            "ALTER TABLE pricing_rules ADD COLUMN multi_day_discount_percent FLOAT DEFAULT 15.0",
            "ALTER TABLE pricing_rules ADD COLUMN monthly_commuter_price FLOAT DEFAULT 2200.0",
            # bookings
            "ALTER TABLE bookings ADD COLUMN booking_product_type VARCHAR(50) DEFAULT 'HOURLY'",
            "ALTER TABLE bookings ADD COLUMN space_number VARCHAR(50) DEFAULT 'Slot A01'",
            "ALTER TABLE bookings ADD COLUMN odometer_reading FLOAT",
            "ALTER TABLE bookings ADD COLUMN odometer_photo_url VARCHAR(500)",
            "ALTER TABLE bookings ADD COLUMN odometer_submitted_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE bookings ADD COLUMN odometer_ocr_text VARCHAR(100)",
            "ALTER TABLE bookings ADD COLUMN exterior_photos TEXT",
            "ALTER TABLE bookings ADD COLUMN damage_notes TEXT",
            "ALTER TABLE bookings ADD COLUMN driver_arrived_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE bookings ADD COLUMN key_received_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE bookings ADD COLUMN collection_requested_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE bookings ADD COLUMN release_otp_hash VARCHAR(255)",
            "ALTER TABLE bookings ADD COLUMN release_otp_expires_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE bookings ADD COLUMN release_otp_attempts INTEGER DEFAULT 0",
            "ALTER TABLE bookings ADD COLUMN vehicle_released_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE bookings ADD COLUMN payment_expires_at TIMESTAMP WITH TIME ZONE",
            # users verification
            "ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500)",
            "ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE",
            # host_profiles identity verification
            "ALTER TABLE host_profiles ADD COLUMN legal_name VARCHAR(255)",
            "ALTER TABLE host_profiles ADD COLUMN profile_photo_url VARCHAR(500)",
            "ALTER TABLE host_profiles ADD COLUMN gov_id_type VARCHAR(50)",
            "ALTER TABLE host_profiles ADD COLUMN gov_id_number VARCHAR(100)",
            "ALTER TABLE host_profiles ADD COLUMN gov_id_document_url VARCHAR(500)",
            "ALTER TABLE host_profiles ADD COLUMN id_verification_provider VARCHAR(100) DEFAULT 'DigiLocker Sandbox'",
            "ALTER TABLE host_profiles ADD COLUMN id_verified_at TIMESTAMP WITH TIME ZONE"
        ]
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass

        # Ensure avasanth081@gmail.com has ADMIN role
        try:
            admin_user = conn.execute(text("SELECT id FROM users WHERE email = 'avasanth081@gmail.com'")).fetchone()
            if admin_user:
                admin_uid = admin_user[0]
                has_admin = conn.execute(text(f"SELECT id FROM user_roles WHERE user_id = {admin_uid} AND role = 'ADMIN'")).fetchone()
                if not has_admin:
                    conn.execute(text(f"INSERT INTO user_roles (user_id, role) VALUES ({admin_uid}, 'ADMIN')"))
                    conn.commit()
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
