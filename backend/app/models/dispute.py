import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class DisputeStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class DisputeCategoryEnum(str, enum.Enum):
    # Customer Categories
    SPACE_UNAVAILABLE = "SPACE_UNAVAILABLE"
    HOST_NO_ACCESS = "HOST_NO_ACCESS"
    SPACE_OCCUPIED = "SPACE_OCCUPIED"
    WRONG_LOCATION = "WRONG_LOCATION"
    UNSAFE_LISTING = "UNSAFE_LISTING"
    PAYMENT_PROBLEM = "PAYMENT_PROBLEM"
    CUSTOMER_OTHER = "CUSTOMER_OTHER"

    # Host Categories
    CUSTOMER_NO_SHOW = "CUSTOMER_NO_SHOW"
    WRONG_VEHICLE = "WRONG_VEHICLE"
    DAMAGE = "DAMAGE"
    SPACE_MISUSE = "SPACE_MISUSE"
    HOST_OTHER = "HOST_OTHER"

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    dispute_reference = Column(String(50), unique=True, index=True, nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reporter_role = Column(String(20), nullable=False)  # PARKER or HOST
    category = Column(Enum(DisputeCategoryEnum), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatusEnum), default=DisputeStatusEnum.OPEN, nullable=False, index=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_by_admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    booking = relationship("Booking", backref="disputes")
    reporter = relationship("User", foreign_keys=[reporter_id])
    reported_user = relationship("User", foreign_keys=[reported_user_id])
