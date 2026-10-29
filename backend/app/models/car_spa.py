"""Car Spa workshop centers, priced services, and customer bookings."""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


def _now():
    return datetime.now(timezone.utc)


class CarSpaStatusEnum(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"


class CarSpaBookingStatusEnum(str, enum.Enum):
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    PAID_AWAITING_SLOT = "PAID_AWAITING_SLOT"
    SLOT_ASSIGNED = "SLOT_ASSIGNED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class CarSpaCenter(Base):
    __tablename__ = "car_spa_centers"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    name = Column(String(255), nullable=False)
    city = Column(String(120), nullable=False, index=True)
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    photo_url = Column(Text, nullable=True)
    operating_hours = Column(String(120), default="08:00 AM - 08:00 PM")

    status = Column(String(30), default=CarSpaStatusEnum.PENDING_APPROVAL.value, index=True)
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    host = relationship(
        "Host",
        primaryjoin="CarSpaCenter.host_id==Host.id",
        foreign_keys="CarSpaCenter.host_id",
    )
    services = relationship(
        "CarSpaService",
        back_populates="center",
        cascade="all, delete-orphan",
        order_by="CarSpaService.id",
    )
    bookings = relationship("CarSpaBooking", back_populates="center")


class CarSpaService(Base):
    __tablename__ = "car_spa_services"

    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("car_spa_centers.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, default=45)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    center = relationship("CarSpaCenter", back_populates="services")
    bookings = relationship("CarSpaBooking", back_populates="service")


class CarSpaBooking(Base):
    __tablename__ = "car_spa_bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(40), unique=True, nullable=False, index=True)

    center_id = Column(Integer, ForeignKey("car_spa_centers.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("car_spa_services.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Snapshots so history survives service edits
    service_name = Column(String(255), nullable=False)
    service_price = Column(Float, nullable=False)
    spa_name = Column(String(255), nullable=False)
    spa_city = Column(String(120), nullable=False)
    spa_address = Column(Text, nullable=False)
    spa_phone = Column(String(50), nullable=False)

    wanted_date = Column(Date, nullable=False)
    customer_note = Column(Text, nullable=True)

    slot_start = Column(DateTime, nullable=True)
    slot_end = Column(DateTime, nullable=True)

    status = Column(String(40), default=CarSpaBookingStatusEnum.AWAITING_PAYMENT.value, index=True)

    amount_paid = Column(Float, default=0.0)
    paid_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    center = relationship("CarSpaCenter", back_populates="bookings")
    service = relationship("CarSpaService", back_populates="bookings")
    customer = relationship(
        "User",
        primaryjoin="CarSpaBooking.customer_id==User.id",
        foreign_keys="CarSpaBooking.customer_id",
    )
    payments = relationship(
        "CarSpaPayment",
        back_populates="booking",
        cascade="all, delete-orphan",
    )


class CarSpaPayment(Base):
    __tablename__ = "car_spa_payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("car_spa_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    payment_id = Column(String(100), index=True, nullable=True)
    signature = Column(String(255), nullable=True)
    provider = Column(String(20), default="RAZORPAY")
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(20), default="PENDING", index=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    booking = relationship("CarSpaBooking", back_populates="payments")
