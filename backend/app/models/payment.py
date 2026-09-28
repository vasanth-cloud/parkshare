import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class PaymentStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"

class PaymentProviderEnum(str, enum.Enum):
    RAZORPAY = "RAZORPAY"
    MOCK = "MOCK"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    payment_id = Column(String(100), unique=True, index=True, nullable=True)
    signature = Column(String(255), nullable=True)

    provider = Column(Enum(PaymentProviderEnum), default=PaymentProviderEnum.RAZORPAY)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.PENDING, index=True)
    
    # Financial Breakdown
    host_gross_earning = Column(Float, nullable=False)
    platform_commission = Column(Float, nullable=False)
    tax_collected = Column(Float, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    booking = relationship("Booking", back_populates="payment")
    refund = relationship("Refund", back_populates="payment", uselist=False)

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), unique=True, nullable=False)
    refund_reference = Column(String(100), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="PROCESSED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    payment = relationship("Payment", back_populates="refund")

class HostPayout(Base):
    __tablename__ = "host_payouts"

    id = Column(Integer, primary_key=True, index=True)
    host_profile_id = Column(Integer, ForeignKey("host_profiles.id", ondelete="CASCADE"), nullable=False)
    payout_reference = Column(String(100), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="COMPLETED")
    bank_account_last4 = Column(String(10), nullable=True)
    processed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
