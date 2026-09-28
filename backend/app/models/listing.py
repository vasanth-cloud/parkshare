import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ParkingTypeEnum(str, enum.Enum):
    DRIVEWAY = "DRIVEWAY"
    PRIVATE_PARKING = "PRIVATE_PARKING"
    APARTMENT_PARKING = "APARTMENT_PARKING"
    COMMERCIAL_PARKING = "COMMERCIAL_PARKING"
    OFFICE_PARKING = "OFFICE_PARKING"
    RESIDENTIAL_PARKING = "RESIDENTIAL_PARKING"
    OPEN_LOT = "OPEN_LOT"
    COVERED_PARKING = "COVERED_PARKING"
    GARAGE = "GARAGE"
    OTHER = "OTHER"

class ListingStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class HostTypeEnum(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    BUSINESS = "BUSINESS"

class BookingProductTypeEnum(str, enum.Enum):
    HOURLY = "HOURLY"
    DAILY = "DAILY"
    MULTI_DAY = "MULTI_DAY"
    MONTHLY_FULL = "MONTHLY_FULL"
    MONTHLY_COMMUTER = "MONTHLY_COMMUTER"

class BookingModeEnum(str, enum.Enum):
    INSTANT = "INSTANT"
    MANUAL_APPROVAL = "MANUAL_APPROVAL"

class ParkingListing(Base):
    __tablename__ = "parking_listings"

    id = Column(Integer, primary_key=True, index=True)
    host_profile_id = Column(Integer, ForeignKey("host_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parking_type = Column(Enum(ParkingTypeEnum), nullable=False, default=ParkingTypeEnum.DRIVEWAY)
    
    # Location (Exact - Restricted until booking confirmed)
    exact_address = Column(Text, nullable=False)
    area = Column(String(100), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    access_instructions = Column(Text, nullable=True)

    # Host & Inventory Type
    host_type = Column(Enum(HostTypeEnum), default=HostTypeEnum.INDIVIDUAL)
    total_spaces = Column(Integer, default=1)  # e.g., 1 for Homeowner, 25 for Commercial Building

    # Space Capabilities & Dimensions
    capacity = Column(Integer, default=1)
    dimensions_description = Column(String(100), nullable=True)  # e.g., "15x10 ft"
    max_length_m = Column(Float, nullable=True)                  # Max length in meters
    max_width_m = Column(Float, nullable=True)                   # Max width in meters
    max_height_m = Column(Float, nullable=True)                  # Height clearance in meters
    is_covered = Column(Boolean, default=False)
    is_indoor = Column(Boolean, default=False)
    has_cctv = Column(Boolean, default=False)
    has_ev_charging = Column(Boolean, default=False)
    has_disabled_access = Column(Boolean, default=False)
    has_24_7_access = Column(Boolean, default=True)
    has_gated_access = Column(Boolean, default=False)
    has_security_guard = Column(Boolean, default=False)
    allowed_vehicle_types = Column(JSON, nullable=False, default=list)  # ["CAR", "SUV", "BIKE"]
    parking_rules = Column(Text, nullable=True)

    # Operational & Approval
    booking_mode = Column(Enum(BookingModeEnum), default=BookingModeEnum.INSTANT)
    status = Column(Enum(ListingStatusEnum), default=ListingStatusEnum.PENDING_APPROVAL, index=True)
    rejection_reason = Column(Text, nullable=True)

    # Performance
    average_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @property
    def approximate_address(self) -> str:
        return f"{self.area}, {self.city}"

    # Relationships
    host = relationship("HostProfile", back_populates="listings")
    images = relationship("ParkingListingImage", back_populates="listing", cascade="all, delete-orphan")
    availabilities = relationship("ParkingAvailability", back_populates="listing", cascade="all, delete-orphan")
    pricing_rule = relationship("PricingRule", back_populates="listing", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="listing")
    reviews = relationship("Review", back_populates="listing")
    favorites = relationship("Favorite", back_populates="listing", cascade="all, delete-orphan")

class ParkingListingImage(Base):
    __tablename__ = "parking_listing_images"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("parking_listings.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    is_cover = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)

    listing = relationship("ParkingListing", back_populates="images")

class ParkingAvailability(Base):
    __tablename__ = "parking_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("parking_listings.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday, -1=Everyday
    start_time = Column(String(5), nullable=False, default="00:00")  # HH:MM 24-hr
    end_time = Column(String(5), nullable=False, default="23:59")    # HH:MM 24-hr
    is_available = Column(Boolean, default=True)

    listing = relationship("ParkingListing", back_populates="availabilities")

class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("parking_listings.id", ondelete="CASCADE"), unique=True, nullable=False)
    hourly_price = Column(Float, nullable=False, default=40.0)  # INR/hr
    daily_price = Column(Float, nullable=True, default=250.0)    # INR/day
    multi_day_discount_percent = Column(Float, nullable=True, default=15.0)  # e.g., 15% discount for 3+ days
    monthly_price = Column(Float, nullable=True, default=3500.0) # INR/month Full 24/7
    monthly_commuter_price = Column(Float, nullable=True, default=2200.0) # INR/month Commuter Mon-Fri 8am-8pm
    minimum_duration_hours = Column(Integer, default=1)
    maximum_duration_hours = Column(Integer, default=720)      # 30 days default
    security_deposit = Column(Float, default=0.0)

    listing = relationship("ParkingListing", back_populates="pricing_rule")
