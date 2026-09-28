import pytest
from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal
from app.models.user import User, Vehicle
from app.models.listing import ParkingListing, PricingRule, HostTypeEnum, BookingProductTypeEnum, ListingStatusEnum
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreate, PriceCalculationRequest

def test_multi_product_price_calculations():
    db = SessionLocal()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    now = datetime.now(timezone.utc)

    # 1. Hourly (3 Hours)
    p_hourly = BookingService.calculate_price(
        db, listing.id, now, now + timedelta(hours=3), product_type=BookingProductTypeEnum.HOURLY
    )
    assert p_hourly.duration_hours == 3.0
    assert p_hourly.booking_product_type == BookingProductTypeEnum.HOURLY
    assert p_hourly.parking_fee == 3.0 * listing.pricing_rule.hourly_price

    # 2. Daily (2 Days)
    p_daily = BookingService.calculate_price(
        db, listing.id, now, now + timedelta(days=2), product_type=BookingProductTypeEnum.DAILY
    )
    assert p_daily.booking_product_type == BookingProductTypeEnum.DAILY
    assert p_daily.parking_fee == 2.0 * (listing.pricing_rule.daily_price or 250.0)

    # 3. Multi-Day (5 Days with Discount)
    p_multi = BookingService.calculate_price(
        db, listing.id, now, now + timedelta(days=5), product_type=BookingProductTypeEnum.MULTI_DAY
    )
    assert p_multi.booking_product_type == BookingProductTypeEnum.MULTI_DAY
    daily_rate = listing.pricing_rule.daily_price or 250.0
    expected_fee = round(5.0 * daily_rate * (1.0 - 0.15), 2)
    assert p_multi.parking_fee == expected_fee

    # 4. Monthly Full 24/7 (1 Month)
    p_monthly_full = BookingService.calculate_price(
        db, listing.id, now, now + timedelta(days=30), product_type=BookingProductTypeEnum.MONTHLY_FULL
    )
    assert p_monthly_full.booking_product_type == BookingProductTypeEnum.MONTHLY_FULL
    assert p_monthly_full.parking_fee == (listing.pricing_rule.monthly_price or 3500.0)

    # 5. Monthly Commuter Mon-Fri (1 Month)
    p_commuter = BookingService.calculate_price(
        db, listing.id, now, now + timedelta(days=30), product_type=BookingProductTypeEnum.MONTHLY_COMMUTER
    )
    assert p_commuter.booking_product_type == BookingProductTypeEnum.MONTHLY_COMMUTER
    assert p_commuter.parking_fee == (listing.pricing_rule.monthly_commuter_price or 2200.0)
    db.close()

def test_booking_creation_with_product_type_and_space_number():
    db = SessionLocal()
    parker = db.query(User).filter(User.email == "parker@parkshare.com").first()
    listing = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE).first()
    vehicle = db.query(Vehicle).filter(Vehicle.user_id == parker.id).first()

    now = datetime.now(timezone.utc) + timedelta(days=50)

    booking_data = BookingCreate(
        listing_id=listing.id,
        vehicle_id=vehicle.id,
        start_time=now,
        end_time=now + timedelta(days=30),
        booking_product_type=BookingProductTypeEnum.MONTHLY_COMMUTER
    )

    booking = BookingService.create_booking(db, parker.id, booking_data)
    assert booking.booking_product_type == BookingProductTypeEnum.MONTHLY_COMMUTER
    assert booking.space_number is not None
    assert "Slot" in booking.space_number
    db.close()
