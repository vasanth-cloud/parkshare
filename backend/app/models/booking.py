import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

from app.models.listing import BookingProductTypeEnum

class BookingStatusEnum(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"

class VerificationMethodEnum(str, enum.Enum):
    QR_CODE = "QR_CODE"
    VERIFICATION_CODE = "VERIFICATION_CODE"

class CancellationTierEnum(str, enum.Enum):
    FULL_REFUND = "FULL_REFUND"
    PARTIAL_REFUND = "PARTIAL_REFUND"
    NO_REFUND = "NO_REFUND"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    listing_id = Column(Integer, ForeignKey("parking_listings.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)

    booking_product_type = Column(Enum(BookingProductTypeEnum), default=BookingProductTypeEnum.HOURLY, index=True)
    space_number = Column(String(50), nullable=True)  # e.g., "Slot A01"

    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)

    # Verification Tokens
    verification_code = Column(String(6), nullable=False)  # 4-6 digit numeric code
    qr_token = Column(String(255), unique=True, nullable=False, index=True)

    # Pricing Breakdown (Stored in INR)
    parking_fee = Column(Float, nullable=False)
    platform_fee = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)

    # Status & Flow
    status = Column(Enum(BookingStatusEnum), default=BookingStatusEnum.PENDING_PAYMENT, index=True)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by = Column(String(50), nullable=True)  # PARKER, HOST, ADMIN
    cancellation_tier = Column(Enum(CancellationTierEnum), nullable=True)
    refund_amount = Column(Float, default=0.0)
    cancelled_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="bookings")
    listing = relationship("ParkingListing", back_populates="bookings")
    vehicle = relationship("Vehicle")
    session = relationship("ParkingSession", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False)
    review = relationship("Review", back_populates="booking", uselist=False)

class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    verification_method = Column(Enum(VerificationMethodEnum), nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    overtime_hours = Column(Float, default=0.0)
    overtime_fee = Column(Float, default=0.0)

    booking = relationship("Booking", back_populates="session")

class HostCancellationRecord(Base):
    __tablename__ = "host_cancellation_records"

    id = Column(Integer, primary_key=True, index=True)
    host_profile_id = Column(Integer, ForeignKey("host_profiles.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=True)
    is_last_minute = Column(Boolean, default=False)
    penalty_fee = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="HOST_CANCELLED_BOOKING")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
