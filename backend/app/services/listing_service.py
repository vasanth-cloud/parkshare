import math
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status
from app.models.listing import ParkingListing, ParkingListingImage, ParkingAvailability, PricingRule, ListingStatusEnum, HostTypeEnum
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
    def get_active_occupancy_count(db: Session, listing_id: int) -> int:
        from datetime import datetime, timezone
        from app.models.booking import Booking, BookingStatusEnum
        now = datetime.now(timezone.utc)
        return db.query(Booking).filter(
            Booking.listing_id == listing_id,
            Booking.status.in_([
                BookingStatusEnum.CONFIRMED,
                BookingStatusEnum.DRIVER_ARRIVED,
                BookingStatusEnum.ODOMETER_PHOTO_SUBMITTED,
                BookingStatusEnum.KEY_HANDOVER_PENDING,
                BookingStatusEnum.KEY_RECEIVED,
                BookingStatusEnum.PARKING_ACTIVE,
                BookingStatusEnum.ACTIVE,
                BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED,
                BookingStatusEnum.RELEASE_OTP_VERIFIED,
                BookingStatusEnum.DISPUTE_OPENED,
            ]),
            or_(
                Booking.end_time > now,
                Booking.status.in_([
                    BookingStatusEnum.DRIVER_ARRIVED,
                    BookingStatusEnum.ODOMETER_PHOTO_SUBMITTED,
                    BookingStatusEnum.KEY_HANDOVER_PENDING,
                    BookingStatusEnum.KEY_RECEIVED,
                    BookingStatusEnum.PARKING_ACTIVE,
                    BookingStatusEnum.ACTIVE,
                    BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED,
                    BookingStatusEnum.RELEASE_OTP_VERIFIED,
                    BookingStatusEnum.DISPUTE_OPENED,
                ])
            )
        ).count()

    @staticmethod
    def create_listing(db: Session, user_id: int, data: ListingCreate) -> dict:
        host_profile = db.query(HostProfile).filter(HostProfile.user_id == user_id).first()
        if not host_profile:
            # Auto create host profile if missing
            host_profile = HostProfile(user_id=user_id)
            db.add(host_profile)
            db.commit()
            db.refresh(host_profile)

        # Enforce Host Identity Verification before allowing space submission
        if not host_profile.is_identity_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Host identity verification required before submitting a space. Please complete your Legal Name, Mobile OTP, Email verification, Profile Photo, and Government ID (Aadhaar / PAN / Driving Licence / Passport)."
            )

        # Physical Presence On-Site Verification Check ("Prove you are physically there")
        loc_verified = False
        v_lat = None
        v_lng = None
        v_photo = None
        v_meta = None
        if data.location_verification and data.location_verification.verified_latitude is not None and data.location_verification.verified_longitude is not None:
            v_lat = data.location_verification.verified_latitude
            v_lng = data.location_verification.verified_longitude
            v_photo = data.location_verification.verification_photo_url
            dist_km = haversine_distance_km(data.latitude, data.longitude, v_lat, v_lng)
            dist_m = round(dist_km * 1000, 1)
            is_match = dist_m <= 350.0  # Within 350m of declared pin
            loc_verified = True
            from datetime import datetime, timezone
            v_meta = {
                "gps_captured": True,
                "verified_lat": v_lat,
                "verified_lng": v_lng,
                "declared_lat": data.latitude,
                "declared_lng": data.longitude,
                "distance_to_declared_m": dist_m,
                "is_address_match": is_match,
                "gps_accuracy_m": data.location_verification.gps_accuracy_m or 10.0,
                "verified_at_iso": datetime.now(timezone.utc).isoformat()
            }

        from datetime import datetime, timezone
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
            status=ListingStatusEnum.PENDING_APPROVAL,
            is_location_verified=loc_verified,
            verified_latitude=v_lat,
            verified_longitude=v_lng,
            verified_at=datetime.now(timezone.utc) if loc_verified else None,
            verification_photo_url=v_photo,
            location_verification_metadata=v_meta,
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)

        # Enforce Real Live Photos (Anti-Fraud Verification)
        if len(data.images) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 3 real live photos of the parking space are mandatory (Entrance from road, Actual parking slot, and Wider surroundings/access view)."
            )

        captions = [img.caption.upper().strip() for img in data.images if img.caption]
        has_entrance = any("ENTRANCE" in c or "ROAD" in c for c in captions)
        has_slot = any("SLOT" in c or "PARKING" in c for c in captions)
        has_surroundings = any("SURROUNDING" in c or "WIDE" in c or "ACCESS" in c for c in captions)

        if not has_entrance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A live photo of 'Entrance from road' is mandatory to verify vehicle access."
            )
        if not has_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A live photo of 'Actual parking slot' is mandatory."
            )
        if not has_surroundings:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A live photo of 'Wider view showing surroundings/access' is mandatory."
            )

        # Conditional checks
        is_covered_type = data.is_covered or data.is_indoor or (hasattr(data.parking_type, 'value') and data.parking_type.value in ["COVERED_PARKING", "GARAGE"])
        if is_covered_type and not any("ROOF" in c or "CLEARANCE" in c or "HEIGHT" in c for c in captions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="For covered/indoor parking, a live photo of the 'Roof / height-clearance' is mandatory."
            )

        if data.has_gated_access and not any("GATE" in c or "BARRIER" in c for c in captions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="For gated access parking, a live photo of the 'Gate / entry area' is mandatory."
            )

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

        # Save Live Captured Images
        for idx, img in enumerate(data.images):
            db.add(ParkingListingImage(
                listing_id=listing.id,
                image_url=img.image_url,
                caption=img.caption,
                is_cover=(idx == 0 or img.is_cover),
                display_order=img.display_order or idx
            ))

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
        return ListingService.get_listing_by_id(db, listing.id, current_user_id=user_id)

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
            # 1. Reserved / Occupied filter:
            # If the parking space is reserved / occupied by active bookings meeting/exceeding capacity,
            # it should NOT show to customers in search!
            active_occupancy = ListingService.get_active_occupancy_count(db, listing.id)
            if active_occupancy >= listing.capacity:
                continue

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
                "rejection_reason": listing.rejection_reason,
                "is_reserved": False,
                "available_spaces": max(0, listing.capacity - active_occupancy),
                "is_location_verified": listing.is_location_verified,
                "verification_photo_url": listing.verification_photo_url,
                "location_verification_metadata": listing.location_verification_metadata,
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

        active_occupancy = ListingService.get_active_occupancy_count(db, listing.id)

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
            "rejection_reason": listing.rejection_reason,
            "is_reserved": active_occupancy >= listing.capacity,
            "available_spaces": max(0, listing.capacity - active_occupancy),
            "is_location_verified": listing.is_location_verified,
            "verified_latitude": listing.verified_latitude,
            "verified_longitude": listing.verified_longitude,
            "verified_at": listing.verified_at,
            "verification_photo_url": listing.verification_photo_url,
            "location_verification_metadata": listing.location_verification_metadata,
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
            "host": {
                "id": listing.host.id,
                "full_name": listing.host.user.full_name if (listing.host and listing.host.user) else (listing.host.legal_name if listing.host else "Host"),
                "legal_name": (listing.host.legal_name or (listing.host.user.full_name if listing.host.user else "Host")) if listing.host else "Host",
                "email": listing.host.user.email if (listing.host and listing.host.user) else None,
                "phone_number": listing.host.user.phone_number if (listing.host and listing.host.user) else None,
                "host_type": listing.host_type.value if hasattr(listing, "host_type") and listing.host_type else "INDIVIDUAL",
                "email_verified": bool(listing.host.user.email_verified) if (listing.host and listing.host.user) else False,
                "phone_verified": bool(listing.host.user.phone_verified) if (listing.host and listing.host.user) else False,
                "is_identity_verified": bool(listing.host.is_identity_verified) if listing.host else False,
                "government_id_type": (listing.host.gov_id_type if hasattr(listing.host, 'gov_id_type') else getattr(listing.host, 'government_id_type', None)) if listing.host else None,
                "property_proof_verified": bool(listing.host.is_identity_verified) if listing.host else False,
                "authorization_status": "Verified" if (hasattr(listing, "host_type") and listing.host_type == HostTypeEnum.BUSINESS) else "N/A"
            } if listing.host else None,
            "created_at": listing.created_at
        }

    @staticmethod
    def update_listing(db: Session, listing_id: int, user_id: int, data: ListingUpdate) -> dict:
        host_profile = db.query(HostProfile).filter(HostProfile.user_id == user_id).first()
        if not host_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host profile not found")

        listing = db.query(ParkingListing).filter(
            ParkingListing.id == listing_id,
            ParkingListing.host_profile_id == host_profile.id
        ).first()
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

        # Exclude special relations from direct attr setting
        special_fields = {"pricing_rule", "images", "location_verification", "resubmit_for_approval"}
        update_data = data.dict(exclude_unset=True, exclude=special_fields)
        for field, value in update_data.items():
            if hasattr(listing, field):
                if field == "allowed_vehicle_types" and value:
                    setattr(listing, field, [v.value if hasattr(v, 'value') else v for v in value])
                else:
                    setattr(listing, field, value)

        # Update physical location verification if provided
        if data.location_verification and data.location_verification.verified_latitude is not None and data.location_verification.verified_longitude is not None:
            v_lat = data.location_verification.verified_latitude
            v_lng = data.location_verification.verified_longitude
            v_photo = data.location_verification.verification_photo_url
            dist_km = haversine_distance_km(listing.latitude, listing.longitude, v_lat, v_lng)
            dist_m = round(dist_km * 1000, 1)
            is_match = dist_m <= 350.0
            from datetime import datetime, timezone
            listing.is_location_verified = True
            listing.verified_latitude = v_lat
            listing.verified_longitude = v_lng
            listing.verified_at = datetime.now(timezone.utc)
            listing.verification_photo_url = v_photo
            listing.location_verification_metadata = {
                "gps_captured": True,
                "verified_lat": v_lat,
                "verified_lng": v_lng,
                "declared_lat": listing.latitude,
                "declared_lng": listing.longitude,
                "distance_to_declared_m": dist_m,
                "is_address_match": is_match,
                "gps_accuracy_m": data.location_verification.gps_accuracy_m or 10.0,
                "verified_at_iso": datetime.now(timezone.utc).isoformat()
            }

        # Update live images if provided
        if data.images is not None and len(data.images) > 0:
            db.query(ParkingListingImage).filter(ParkingListingImage.listing_id == listing.id).delete()
            for idx, img in enumerate(data.images):
                db.add(ParkingListingImage(
                    listing_id=listing.id,
                    image_url=img.image_url,
                    caption=img.caption,
                    is_cover=(idx == 0 or img.is_cover),
                    display_order=img.display_order or idx
                ))

        # Update pricing if provided
        if data.pricing_rule is not None:
            if listing.pricing_rule:
                for p_field, p_val in data.pricing_rule.dict(exclude_unset=True).items():
                    setattr(listing.pricing_rule, p_field, p_val)
            else:
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

        # If resubmitting or updating a REJECTED space, reset status to PENDING_APPROVAL and clear previous rejection reason
        if getattr(data, 'resubmit_for_approval', False) or listing.status == ListingStatusEnum.REJECTED:
            listing.status = ListingStatusEnum.PENDING_APPROVAL
            listing.rejection_reason = None

        db.commit()
        db.refresh(listing)
        return ListingService.get_listing_by_id(db, listing.id, current_user_id=user_id)

    @staticmethod
    def delete_listing(db: Session, listing_id: int, user_id: int, is_admin: bool = False) -> dict:
        host_profile = db.query(HostProfile).filter(HostProfile.user_id == user_id).first()

        query = db.query(ParkingListing).filter(ParkingListing.id == listing_id)
        if not is_admin:
            if not host_profile:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Host profile not found")
            query = query.filter(ParkingListing.host_profile_id == host_profile.id)

        listing = query.first()
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking space not found or you do not have permission to delete it")

        # Check if there are active / ongoing bookings on this space
        active_occupancy = ListingService.get_active_occupancy_count(db, listing.id)
        if active_occupancy > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete parking space '{listing.title}' because it has {active_occupancy} active or in-progress booking(s)."
            )

        title = listing.title
        db.delete(listing)
        db.commit()
        return {"message": f"Parking space '{title}' was successfully deleted.", "id": listing_id}


