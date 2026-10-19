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
            "ALTER TABLE users ALTER COLUMN profile_photo_url TYPE TEXT",
            "ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE",
            # host_profiles identity verification
            "ALTER TABLE host_profiles ADD COLUMN legal_name VARCHAR(255)",
            "ALTER TABLE host_profiles ADD COLUMN profile_photo_url VARCHAR(500)",
            "ALTER TABLE host_profiles ALTER COLUMN profile_photo_url TYPE TEXT",
            "ALTER TABLE host_profiles ADD COLUMN gov_id_type VARCHAR(50)",
            "ALTER TABLE host_profiles ADD COLUMN gov_id_number VARCHAR(100)",
            "ALTER TABLE host_profiles ADD COLUMN gov_id_document_url VARCHAR(500)",
            "ALTER TABLE host_profiles ALTER COLUMN gov_id_document_url TYPE TEXT",
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

    split_account_tables()


def _drop_user_fks(conn, text):
    """Drop foreign keys that must not keep hosts or admins inside users."""
    drop_targets = {
        ("host_profiles", "user_id"),
        ("acting_driver_profiles", "user_id"),
        ("notifications", "user_id"),
        ("disputes", "reporter_id"),
        ("disputes", "reported_user_id"),
        ("disputes", "resolved_by_admin_id"),
        ("parking_sessions", "verified_by_user_id"),
    }
    rows = conn.execute(text("""
        SELECT rel.relname AS table_name, att.attname AS column_name, con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_class frel ON frel.oid = con.confrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f' AND frel.relname = 'users'
    """)).fetchall()
    for table_name, column_name, conname in rows:
        if (table_name, column_name) in drop_targets:
            conn.execute(text(f'ALTER TABLE "{table_name}" DROP CONSTRAINT IF EXISTS "{conname}"'))


def _has_fk(conn, text, table: str, column: str, ref: str) -> bool:
    found = conn.execute(text("""
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_class frel ON frel.oid = con.confrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f'
          AND rel.relname = :table
          AND att.attname = :column
          AND frel.relname = :ref
    """), {"table": table, "column": column, "ref": ref}).first()
    return found is not None


def _accounts_already_split(conn, text) -> bool:
    """Read-only check so startup does not take table locks on every reload."""
    if conn.execute(text("SELECT to_regclass('public.hosts')")).scalar() is None:
        return False
    if conn.execute(text("SELECT to_regclass('public.admins')")).scalar() is None:
        return False
    if conn.execute(text("SELECT to_regclass('public.host_profiles')")).scalar() and not _has_fk(conn, text, "host_profiles", "user_id", "hosts"):
        return False
    if conn.execute(text("SELECT to_regclass('public.acting_driver_profiles')")).scalar() and not _has_fk(conn, text, "acting_driver_profiles", "user_id", "hosts"):
        return False
    if conn.execute(text("SELECT to_regclass('public.notifications')")).scalar():
        has_column = conn.execute(text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'account_type'
        """)).first()
        if not has_column:
            return False
    leftover_role = conn.execute(text(
        "SELECT 1 FROM user_roles WHERE role::text IN ('HOST', 'ADMIN') LIMIT 1"
    )).first()
    if leftover_role:
        return False
    stray_admin_host = conn.execute(text("""
        SELECT 1 FROM hosts h
        WHERE h.id IN (SELECT id FROM admins)
          AND NOT EXISTS (SELECT 1 FROM host_profiles hp WHERE hp.user_id = h.id)
          AND NOT EXISTS (SELECT 1 FROM acting_driver_profiles ad WHERE ad.user_id = h.id)
        LIMIT 1
    """)).first()
    return stray_admin_host is None


def split_account_tables():
    """Copy host and admin logins out of users, then point host-owned rows at hosts."""
    if is_sqlite:
        return
    from sqlalchemy import text
    with engine.connect() as conn:
        if _accounts_already_split(conn, text):
            return
    with engine.begin() as conn:
        if conn.execute(text("SELECT to_regclass('public.users')")).scalar() is None:
            return
        if conn.execute(text("SELECT to_regclass('public.hosts')")).scalar() is None:
            return
        if conn.execute(text("SELECT to_regclass('public.admins')")).scalar() is None:
            return

        host_match = [
            "EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role::text = 'HOST')"
        ]
        if conn.execute(text("SELECT to_regclass('public.host_profiles')")).scalar():
            host_match.append("EXISTS (SELECT 1 FROM host_profiles hp WHERE hp.user_id = u.id)")
        if conn.execute(text("SELECT to_regclass('public.acting_driver_profiles')")).scalar():
            host_match.append("EXISTS (SELECT 1 FROM acting_driver_profiles ad WHERE ad.user_id = u.id)")

        conn.execute(text(f"""
            INSERT INTO hosts (
                id, email, hashed_password, full_name, phone_number, profile_photo_url,
                is_active, is_verified, phone_verified, email_verified, created_at, updated_at
            )
            SELECT
                u.id, u.email, u.hashed_password, u.full_name, u.phone_number, u.profile_photo_url,
                COALESCE(u.is_active, TRUE), COALESCE(u.is_verified, FALSE),
                COALESCE(u.phone_verified, FALSE), COALESCE(u.email_verified, FALSE),
                COALESCE(u.created_at, NOW()), COALESCE(u.updated_at, NOW())
            FROM users u
            WHERE ({' OR '.join(host_match)})
              AND NOT EXISTS (
                    SELECT 1 FROM hosts h
                    WHERE h.id = u.id OR lower(h.email) = lower(u.email)
              )
        """))

        conn.execute(text("""
            INSERT INTO admins (
                id, email, hashed_password, full_name, phone_number, profile_photo_url,
                is_active, is_verified, phone_verified, email_verified, created_at, updated_at
            )
            SELECT
                u.id, u.email, u.hashed_password, u.full_name, u.phone_number, u.profile_photo_url,
                COALESCE(u.is_active, TRUE), COALESCE(u.is_verified, FALSE),
                COALESCE(u.phone_verified, FALSE), COALESCE(u.email_verified, FALSE),
                COALESCE(u.created_at, NOW()), COALESCE(u.updated_at, NOW())
            FROM users u
            WHERE (
                EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role::text = 'ADMIN')
                OR lower(u.email) IN ('avasanth081@gmail.com', 'admin@parkshare.com')
            )
              AND NOT EXISTS (
                    SELECT 1 FROM admins a
                    WHERE a.id = u.id OR lower(a.email) = lower(u.email)
              )
        """))

        _drop_user_fks(conn, text)

        if conn.execute(text("SELECT to_regclass('public.host_profiles')")).scalar() and not _has_fk(conn, text, "host_profiles", "user_id", "hosts"):
            conn.execute(text("""
                ALTER TABLE host_profiles
                ADD CONSTRAINT host_profiles_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES hosts(id) ON DELETE CASCADE
            """))
        if conn.execute(text("SELECT to_regclass('public.acting_driver_profiles')")).scalar() and not _has_fk(conn, text, "acting_driver_profiles", "user_id", "hosts"):
            conn.execute(text("""
                ALTER TABLE acting_driver_profiles
                ADD CONSTRAINT acting_driver_profiles_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES hosts(id) ON DELETE CASCADE
            """))

        has_account_type = conn.execute(text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'account_type'
        """)).first()
        if not has_account_type:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN account_type VARCHAR(20)"))
        conn.execute(text("UPDATE notifications SET account_type = 'customer' WHERE account_type IS NULL"))
        conn.execute(text("ALTER TABLE notifications ALTER COLUMN account_type SET DEFAULT 'customer'"))
        conn.execute(text("ALTER TABLE notifications ALTER COLUMN account_type SET NOT NULL"))

        keep_sql = ""
        for table in ("bookings", "vehicles", "reviews", "favorites", "complaints"):
            if conn.execute(text("SELECT to_regclass(:name)"), {"name": f"public.{table}"}).scalar():
                keep_sql += f"\nAND NOT EXISTS (SELECT 1 FROM {table} t WHERE t.user_id = u.id)"
        if conn.execute(text("SELECT to_regclass('public.acting_driver_bookings')")).scalar():
            keep_sql += "\nAND NOT EXISTS (SELECT 1 FROM acting_driver_bookings b WHERE b.customer_id = u.id)"

        conn.execute(text(f"""
            DELETE FROM users u
            WHERE (
                u.id IN (SELECT id FROM hosts)
                OR u.id IN (SELECT id FROM admins)
            )
            {keep_sql}
        """))

        conn.execute(text("DELETE FROM user_roles WHERE role::text IN ('HOST', 'ADMIN')"))

        # An admin who was also given a HOST role should not stay in hosts
        # unless they actually own a parking profile or a driver profile.
        conn.execute(text("""
            DELETE FROM hosts h
            WHERE h.id IN (SELECT id FROM admins)
              AND NOT EXISTS (SELECT 1 FROM host_profiles hp WHERE hp.user_id = h.id)
              AND NOT EXISTS (
                    SELECT 1 FROM acting_driver_profiles ad WHERE ad.user_id = h.id
              )
        """))

        conn.execute(text("""
            UPDATE notifications n
            SET account_type = 'host'
            WHERE n.user_id IN (SELECT id FROM hosts)
              AND n.user_id NOT IN (SELECT id FROM users)
        """))

        for table in ("hosts", "admins", "users"):
            seq = conn.execute(text("SELECT pg_get_serial_sequence(:tbl, 'id')"), {"tbl": table}).scalar()
            if seq:
                conn.execute(text(
                    f"SELECT setval('{seq}', GREATEST(COALESCE((SELECT MAX(id) FROM {table}), 1), 1), true)"
                ))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
