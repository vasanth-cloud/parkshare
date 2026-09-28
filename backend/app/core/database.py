from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

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
            "ALTER TABLE bookings ADD COLUMN space_number VARCHAR(50) DEFAULT 'Slot A01'"
        ]
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
