"""
Acting Driver (Chauffeur-on-demand) domain models.

These tables are fully independent from the parking Booking / Payment tables so the
acting-driver workflow can evolve without touching the parking marketplace.
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def _now():
    return datetime.now(timezone.utc)


class DriverStatusEnum(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"


class DriverBookingStatusEnum(str, enum.Enum):
    REQUESTED = "REQUESTED"              # Broadcast to drivers in the region, waiting for acceptance
    DRIVER_ACCEPTED = "DRIVER_ACCEPTED"  # A driver accepted; customer must pay to unlock contact details
    CONFIRMED = "CONFIRMED"              # Advance paid, driver contact revealed, start OTP issued
    TRIP_STARTED = "TRIP_STARTED"        # Driver verified start OTP at pickup
    PAYMENT_DUE = "PAYMENT_DUE"          # Trip ended with overtime; balance must be settled
    COMPLETED = "COMPLETED"              # Fully settled
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class DriverPaymentPurposeEnum(str, enum.Enum):
    ADVANCE = "ADVANCE"   # Estimated fare paid to unlock the driver
    BALANCE = "BALANCE"   # Overtime / final settlement


class ActingDriverProfile(Base):
    __tablename__ = "acting_driver_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Identity
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    photo_url = Column(Text, nullable=True)

    # Service region
    city = Column(String(120), nullable=False, index=True)
    service_area = Column(String(255), nullable=True)       # e.g. "Indiranagar, Koramangala, HSR"
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    service_radius_km = Column(Float, default=15.0)

    # Driving Licence
    dl_number = Column(String(50), nullable=False)
    dl_expiry_date = Column(String(20), nullable=True)      # ISO date string YYYY-MM-DD
    dl_document_url = Column(Text, nullable=True)
    dl_verified = Column(Boolean, default=False)
    dl_kyc_reference = Column(String(100), nullable=True)

    # Aadhaar
    aadhaar_number = Column(String(20), nullable=False)      # stored normalised (12 digits); always returned masked
    aadhaar_document_url = Column(Text, nullable=True)
    aadhaar_verified = Column(Boolean, default=False)
    aadhaar_kyc_reference = Column(String(100), nullable=True)

    kyc_provider = Column(String(150), nullable=True)
    kyc_verified_at = Column(DateTime, nullable=True)

    # Skills
    experience_years = Column(Integer, default=1)
    transmissions = Column(JSON, default=list)        # ["Manual", "Automatic", "EV"]
    vehicle_categories = Column(JSON, default=list)   # ["HATCHBACK", "SEDAN", "SUV", "LUXURY", "VAN"]
    languages = Column(JSON, default=list)
    trip_types = Column(JSON, default=list)           # ["CITY", "OUTSTATION", "NIGHT"]

    # Platform state
    status = Column(String(30), default=DriverStatusEnum.PENDING_APPROVAL.value, index=True)
    rejection_reason = Column(Text, nullable=True)
    is_available = Column(Boolean, default=True)      # Driver's own online / offline toggle
    approved_at = Column(DateTime, nullable=True)

    # Performance
    rating = Column(Float, default=5.0)
    rating_count = Column(Integer, default=0)
    total_trips = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    user = relationship(
        "Host",
        primaryjoin="ActingDriverProfile.user_id==Host.id",
        foreign_keys="ActingDriverProfile.user_id",
    )
    bookings = relationship("ActingDriverBooking", back_populates="driver")


class ActingDriverPricingConfig(Base):
    """Single-row configuration edited by the admin. Drivers can never set their own price."""
    __tablename__ = "acting_driver_pricing_config"

    id = Column(Integer, primary_key=True, index=True)
    hourly_rate = Column(Float, default=149.0)              # Base driver fee per hour (INR)
    platform_fee_percent = Column(Float, default=10.0)      # Platform commission on top of the driver fee
    tax_percent = Column(Float, default=5.0)                # GST on (driver fee + platform fee)
    min_billable_hours = Column(Float, default=2.0)
    night_surcharge_percent = Column(Float, default=20.0)   # Applied to hours between night_start & night_end
    night_start_hour = Column(Integer, default=22)
    night_end_hour = Column(Integer, default=6)
    outstation_hourly_rate = Column(Float, default=129.0)   # Lower per-hour rate for long trips (>= outstation_min_hours)
    outstation_min_hours = Column(Float, default=10.0)
    car_type_multipliers = Column(JSON, default=dict)       # {"HATCHBACK":1.0,"SEDAN":1.1,"SUV":1.25,"LUXURY":1.5,"VAN":1.2}
    billing_increment_minutes = Column(Integer, default=30)  # Overtime rounded up to this increment
    updated_by_user_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class ActingDriverBooking(Base):
    __tablename__ = "acting_driver_bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(30), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("acting_driver_profiles.id", ondelete="SET NULL"), nullable=True, index=True)

    # Trip request
    pickup_address = Column(Text, nullable=False)
    pickup_city = Column(String(120), nullable=False, index=True)
    pickup_latitude = Column(Float, nullable=True)
    pickup_longitude = Column(Float, nullable=True)
    drop_address = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    trip_type = Column(String(20), default="CITY")          # CITY / OUTSTATION

    # Customer car
    car_type = Column(String(30), nullable=False)            # HATCHBACK / SEDAN / SUV / LUXURY / VAN
    transmission = Column(String(20), nullable=False)        # MANUAL / AUTOMATIC
    seater = Column(Integer, default=5)
    car_make_model = Column(String(150), nullable=True)
    car_registration = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)

    # Estimate (snapshot of admin pricing at booking time)
    hourly_rate = Column(Float, nullable=False)
    car_multiplier = Column(Float, default=1.0)
    platform_fee_percent = Column(Float, nullable=False)
    tax_percent = Column(Float, nullable=False)
    estimated_hours = Column(Float, nullable=False)
    estimated_driver_fee = Column(Float, nullable=False)
    estimated_platform_fee = Column(Float, nullable=False)
    estimated_tax = Column(Float, nullable=False)
    estimated_total = Column(Float, nullable=False)

    # Lifecycle
    status = Column(String(30), default=DriverBookingStatusEnum.REQUESTED.value, index=True)
    accepted_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    start_otp = Column(String(6), nullable=True)
    end_otp = Column(String(6), nullable=True)
    start_otp_attempts = Column(Integer, default=0)
    end_otp_attempts = Column(Integer, default=0)
    trip_started_at = Column(DateTime, nullable=True)
    trip_ended_at = Column(DateTime, nullable=True)

    # Final settlement (filled at trip end)
    actual_hours = Column(Float, nullable=True)
    billable_hours = Column(Float, nullable=True)
    overtime_hours = Column(Float, default=0.0)
    final_driver_fee = Column(Float, nullable=True)
    final_platform_fee = Column(Float, nullable=True)
    final_tax = Column(Float, nullable=True)
    final_total = Column(Float, nullable=True)
    amount_paid = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    driver_earning = Column(Float, default=0.0)

    # Cancellation
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by = Column(String(20), nullable=True)   # CUSTOMER / DRIVER / ADMIN
    cancelled_at = Column(DateTime, nullable=True)
    refund_amount = Column(Float, default=0.0)

    # Feedback
    customer_rating = Column(Integer, nullable=True)
    customer_review = Column(Text, nullable=True)

    created_at = Column(DateTime, default=_now, index=True)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    customer = relationship(
        "User",
        primaryjoin="ActingDriverBooking.customer_id==User.id",
        foreign_keys="ActingDriverBooking.customer_id",
    )
    driver = relationship("ActingDriverProfile", back_populates="bookings")
    payments = relationship("ActingDriverPayment", back_populates="booking", cascade="all, delete-orphan")


class ActingDriverPayment(Base):
    __tablename__ = "acting_driver_payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("acting_driver_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    payment_id = Column(String(100), index=True, nullable=True)
    signature = Column(String(255), nullable=True)
    provider = Column(String(20), default="RAZORPAY")
    purpose = Column(String(20), default=DriverPaymentPurposeEnum.ADVANCE.value)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(20), default="PENDING", index=True)   # PENDING / PAID / FAILED
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    booking = relationship("ActingDriverBooking", back_populates="payments")
