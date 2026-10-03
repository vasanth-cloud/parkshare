import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRoleEnum(str, enum.Enum):
    PARKER = "PARKER"
    HOST = "HOST"
    ADMIN = "ADMIN"

class VehicleTypeEnum(str, enum.Enum):
    BIKE = "BIKE"
    SCOOTER = "SCOOTER"
    CAR = "CAR"
    SUV = "SUV"
    VAN = "VAN"
    OTHER = "OTHER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(50), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    vehicles = relationship("Vehicle", back_populates="user", cascade="all, delete-orphan")
    host_profile = relationship("HostProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")

class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(UserRoleEnum), nullable=False, default=UserRoleEnum.PARKER)

    user = relationship("User", back_populates="roles")

class HostProfile(Base):
    __tablename__ = "host_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    legal_name = Column(String(255), nullable=True)
    business_name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    payout_bank_account = Column(String(255), nullable=True)
    payout_ifsc = Column(String(50), nullable=True)
    payout_upi_id = Column(String(100), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    gov_id_type = Column(String(50), nullable=True)  # AADHAAR, DRIVING_LICENCE, PASSPORT
    gov_id_number = Column(String(100), nullable=True)
    gov_id_document_url = Column(String(500), nullable=True)
    id_verification_provider = Column(String(100), default="DigiLocker Sandbox")
    id_verified_at = Column(DateTime, nullable=True)
    is_identity_verified = Column(Boolean, default=False)
    total_earnings = Column(Float, default=0.0)
    cancellation_count = Column(Integer, default=0)
    penalty_balance = Column(Float, default=0.0)
    reliability_score = Column(Float, default=100.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="host_profile")
    listings = relationship("ParkingListing", back_populates="host", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        if self.legal_name:
            return self.legal_name
        if self.user and self.user.full_name:
            return self.user.full_name
        return "Host"

    @property
    def government_id_type(self):
        return self.gov_id_type

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    registration_number = Column(String(50), index=True, nullable=False)  # Normalized (e.g. TN38AB1234)
    vehicle_type = Column(Enum(VehicleTypeEnum), nullable=False, default=VehicleTypeEnum.CAR)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="vehicles")
