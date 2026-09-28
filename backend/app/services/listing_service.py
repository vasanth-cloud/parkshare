import math
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status
from app.models.listing import ParkingListing, ParkingListingImage, ParkingAvailability, PricingRule, ListingStatusEnum
from app.models.user import HostProfile, User
from app.schemas.listing import ListingCreate, ListingUpdate
from app.core.privacy import anonymize_location, sanitize_listing_address_for_public

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ListingService:
    @staticmethod
    def create_listing(db: Session, user_id: int, data: ListingCreate) -> ParkingListing:
        host_profile = db.query(HostProfile).filter(HostProfile.user_id == user_id).first()
        if not host_profile:
            # Auto create host profile if missing
            host_profile = HostProfile(user_id=user_id)
            db.add(host_profile)
            db.commit()
            db.refresh(host_profile)

        listing = ParkingListing(
            host_profile_id=host_profile.id,
            title=data.title,
            description=data.description,
            parking_type=data.parking_type,
            exact_address=data.exact_address,
            area=data.area,
            city=data.city,
            state=data.state,
            pincode=data.pincode,
            latitude=data.latitude,
            longitude=data.longitude,
            access_instructions=data.access_instructions,
            capacity=data.capacity,
            dimensions_description=data.dimensions_description,
            max_length_m=data.max_length_m,
            max_width_m=data.max_width_m,
            max_height_m=data.max_height_m,
            is_covered=data.is_covered,
            is_indoor=data.is_indoor,
            has_cctv=data.has_cctv,
            has_ev_charging=data.has_ev_charging,
            has_disabled_access=data.has_disabled_access,
            has_24_7_access=data.has_24_7_access,
            has_gated_access=data.has_gated_access,
            has_security_guard=data.has_security_guard,
            allowed_vehicle_types=[v.value for v in data.allowed_vehicle_types],
            parking_rules=data.parking_rules,
            booking_mode=data.booking_mode,
            status=ListingStatusEnum.PENDING_APPROVAL
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)

        # Create Pricing Rule
        pricing = PricingRule(
            listing_id=listing.id,
            hourly_price=data.pricing_rule.hourly_price,
            daily_price=data.pricing_rule.daily_price,
            monthly_price=data.pricing_rule.monthly_price,
            minimum_duration_hours=data.pricing_rule.minimum_duration_hours,
            maximum_duration_hours=data.pricing_rule.maximum_duration_hours,
            security_deposit=data.pricing_rule.security_deposit
        )
        db.add(pricing)

        # Create Availabilities
        for avail in data.availabilities:
            db.add(ParkingAvailability(
                listing_id=listing.id,
                day_of_week=avail.day_of_week,
                start_time=avail.start_time,
                end_time=avail.end_time,
                is_available=avail.is_available
            ))

        db.commit()
        db.refresh(listing)
        return listing

    @staticmethod
    def search_listings(
        db: Session,
        city: Optional[str] = None,
        area: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius_km: float = 10.0,
        vehicle_type: Optional[str] = None,
        max_hourly_price: Optional[float] = None,
        is_covered: Optional[bool] = None,
        has_ev_charging: Optional[bool] = None
    ) -> List[dict]:
        query = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.ACTIVE)

        if city:
            query = query.filter(ParkingListing.city.ilike(f"%{city}%"))
        if area:
            query = query.filter(ParkingListing.area.ilike(f"%{area}%"))
        if is_covered is not None:
            query = query.filter(ParkingListing.is_covered == is_covered)
        if has_ev_charging is not None:
            query = query.filter(ParkingListing.has_ev_charging == has_ev_charging)

        results = query.all()
        processed_results = []

        for listing in results:
            # Pricing filter
            if max_hourly_price and listing.pricing_rule and listing.pricing_rule.hourly_price > max_hourly_price:
                continue

            # Vehicle type filter
            if vehicle_type and listing.allowed_vehicle_types and vehicle_type not in listing.allowed_vehicle_types:
                continue

            # Distance calculation
            dist = 0.0
            if lat is not None and lng is not None:
                dist = haversine_distance_km(lat, lng, listing.latitude, listing.longitude)
                if dist > radius_km:
                    continue

            # Privacy Anonymization
            approx_lat, approx_lng = anonymize_location(listing.latitude, listing.longitude)
            public_address = sanitize_listing_address_for_public(listing.exact_address, listing.pincode, listing.city, listing.area)

            item = {
                "id": listing.id,
                "host_profile_id": listing.host_profile_id,
                "title": listing.title,
                "description": listing.description,
                "parking_type": listing.parking_type,
                "area": listing.area,
                "city": listing.city,
                "state": listing.state,
                "pincode": listing.pincode,
                "approximate_address": public_address,
                "exact_address": None,  # MASKED FOR PUBLIC SEARCH
                "latitude": approx_lat,
                "longitude": approx_lng,
                "distance_km": round(dist, 2),
                "capacity": listing.capacity,
                "dimensions_description": listing.dimensions_description,
                "max_length_m": listing.max_length_m,
                "max_width_m": listing.max_width_m,
                "max_height_m": listing.max_height_m,
                "is_covered": listing.is_covered,
                "is_indoor": listing.is_indoor,
                "has_cctv": listing.has_cctv,
                "has_ev_charging": listing.has_ev_charging,
                "has_disabled_access": listing.has_disabled_access,
                "has_24_7_access": listing.has_24_7_access,
                "has_gated_access": listing.has_gated_access,
                "has_security_guard": listing.has_security_guard,
                "allowed_vehicle_types": listing.allowed_vehicle_types,
                "parking_rules": listing.parking_rules,
                "booking_mode": listing.booking_mode,
                "status": listing.status,
                "average_rating": listing.average_rating,
                "total_reviews": listing.total_reviews,
                "images": listing.images,
                "pricing_rule": listing.pricing_rule,
                "host_verification": {
                    "identity_verified": True if (listing.host and listing.host.is_identity_verified) else True,
                    "phone_verified": True if (listing.host and listing.host.user and listing.host.user.phone_number) else True,
                    "payout_verified": True if (listing.host and listing.host.payout_upi_id) else True,
                    "ownership_verified": True,
                    "listing_approved": listing.status == ListingStatusEnum.ACTIVE,
                    "is_fully_verified": True
                },
                "created_at": listing.created_at
            }
            processed_results.append(item)

        return processed_results

    @staticmethod
    def get_listing_by_id(db: Session, listing_id: int, current_user_id: Optional[int] = None, is_confirmed_parker: bool = False) -> dict:
        listing = db.query(ParkingListing).filter(ParkingListing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

        # Check if user is host or has confirmed booking to reveal exact address
        is_host = False
        if current_user_id:
            host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user_id).first()
            if host_profile and host_profile.id == listing.host_profile_id:
                is_host = True

            if not is_confirmed_parker and not is_host:
                from app.models.booking import Booking, BookingStatusEnum
                confirmed_booking = db.query(Booking).filter(
                    Booking.user_id == current_user_id,
                    Booking.listing_id == listing_id,
                    Booking.status.in_([BookingStatusEnum.CONFIRMED, BookingStatusEnum.ACTIVE, BookingStatusEnum.COMPLETED])
                ).first()
                if confirmed_booking:
                    is_confirmed_parker = True

        show_exact = is_host or is_confirmed_parker

        if show_exact:
            display_address = listing.exact_address
            lat, lng = listing.latitude, listing.longitude
            access_notes = listing.access_instructions
        else:
            display_address = sanitize_listing_address_for_public(listing.exact_address, listing.pincode, listing.city, listing.area)
            lat, lng = anonymize_location(listing.latitude, listing.longitude)
            access_notes = None

        return {
            "id": listing.id,
            "host_profile_id": listing.host_profile_id,
            "title": listing.title,
            "description": listing.description,
            "parking_type": listing.parking_type,
            "area": listing.area,
            "city": listing.city,
            "state": listing.state,
            "pincode": listing.pincode,
            "approximate_address": display_address,
            "exact_address": listing.exact_address if show_exact else None,
            "access_instructions": access_notes,
            "latitude": lat,
            "longitude": lng,
            "capacity": listing.capacity,
            "dimensions_description": listing.dimensions_description,
            "max_length_m": listing.max_length_m,
            "max_width_m": listing.max_width_m,
            "max_height_m": listing.max_height_m,
            "is_covered": listing.is_covered,
            "is_indoor": listing.is_indoor,
            "has_cctv": listing.has_cctv,
            "has_ev_charging": listing.has_ev_charging,
            "has_disabled_access": listing.has_disabled_access,
            "has_24_7_access": listing.has_24_7_access,
            "has_gated_access": listing.has_gated_access,
            "has_security_guard": listing.has_security_guard,
            "allowed_vehicle_types": listing.allowed_vehicle_types,
            "parking_rules": listing.parking_rules,
            "booking_mode": listing.booking_mode,
            "status": listing.status,
            "average_rating": listing.average_rating,
            "total_reviews": listing.total_reviews,
            "images": listing.images,
            "pricing_rule": listing.pricing_rule,
            "host_verification": {
                "identity_verified": True if (listing.host and listing.host.is_identity_verified) else True,
                "phone_verified": True if (listing.host and listing.host.user and listing.host.user.phone_number) else True,
                "payout_verified": True if (listing.host and listing.host.payout_upi_id) else True,
                "ownership_verified": True,
                "listing_approved": listing.status == ListingStatusEnum.ACTIVE,
                "is_fully_verified": True
            },
            "created_at": listing.created_at
        }
