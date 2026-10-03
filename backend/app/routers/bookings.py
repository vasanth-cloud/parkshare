import json
import random
import hashlib
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.schemas.booking import (
    PriceCalculationRequest,
    PriceBreakdown,
    BookingCreate,
    BookingOut,
    CancellationPreviewOut,
    OdometerSubmitRequest,
    VerifyReleaseOtpRequest,
    ReleaseOtpOut,
    EndParkingRequest
)
from app.services.booking_service import BookingService
from app.services.listing_service import ListingService
from app.dependencies.auth import get_current_user
from app.models.user import User, HostProfile
from app.models.booking import Booking, BookingStatusEnum, ParkingSession, VerificationMethodEnum, Notification

router = APIRouter(prefix="/bookings", tags=["Bookings"])

ACTIVE_BOOKING_STATUSES = [
    BookingStatusEnum.CONFIRMED,
    BookingStatusEnum.BOOKING_CREATED,
    BookingStatusEnum.DRIVER_ARRIVED,
    BookingStatusEnum.ODOMETER_PHOTO_SUBMITTED,
    BookingStatusEnum.KEY_HANDOVER_PENDING,
    BookingStatusEnum.KEY_RECEIVED,
    BookingStatusEnum.PARKING_ACTIVE,
    BookingStatusEnum.ACTIVE,
    BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED,
    BookingStatusEnum.RELEASE_OTP_VERIFIED,
    BookingStatusEnum.VEHICLE_RELEASED,
]

def serialize_booking(b: Booking, current_user: User, db: Session) -> dict:
    is_active_or_done = (b.status in ACTIVE_BOOKING_STATUSES) or (b.status == BookingStatusEnum.COMPLETED)
    listing_detail = ListingService.get_listing_by_id(
        db, b.listing_id, current_user_id=current_user.id, is_confirmed_parker=is_active_or_done
    )
    host_user = b.listing.host.user if (b.listing and b.listing.host and b.listing.host.user) else None
    h_name = host_user.full_name if host_user else "Ravi"
    h_phone = host_user.phone_number if (host_user and host_user.phone_number) else "+91 98765 43210"

    return {
        "id": b.id,
        "booking_reference": b.booking_reference,
        "user_id": b.user_id,
        "listing_id": b.listing_id,
        "vehicle_id": b.vehicle_id,
        "booking_product_type": b.booking_product_type,
        "space_number": b.space_number or "Slot A01",
        "start_time": b.start_time,
        "end_time": b.end_time,
        "verification_code": b.verification_code if is_active_or_done else None,
        "qr_token": b.qr_token,
        "parking_fee": b.parking_fee,
        "platform_fee": b.platform_fee,
        "tax": b.tax,
        "total_amount": b.total_amount,
        "status": b.status,
        "cancellation_reason": b.cancellation_reason,
        "cancelled_by": b.cancelled_by,
        "cancellation_tier": b.cancellation_tier,
        "refund_amount": b.refund_amount or 0.0,
        "cancelled_at": b.cancelled_at,
        "odometer_reading": b.odometer_reading,
        "odometer_photo_url": b.odometer_photo_url,
        "odometer_submitted_at": b.odometer_submitted_at,
        "odometer_ocr_text": b.odometer_ocr_text,
        "exterior_photos": b.exterior_photos,
        "damage_notes": b.damage_notes,
        "driver_arrived_at": b.driver_arrived_at,
        "key_received_at": b.key_received_at,
        "collection_requested_at": b.collection_requested_at,
        "vehicle_released_at": b.vehicle_released_at,
        "listing": listing_detail,
        "vehicle": b.vehicle,
        "host_name": h_name,
        "host_phone": h_phone,
        "payment_expires_at": b.payment_expires_at,
        "created_at": b.created_at
    }

@router.post("/calculate-price", response_model=PriceBreakdown)
def calculate_price(data: PriceCalculationRequest, db: Session = Depends(get_db)):
    return BookingService.calculate_price(db, data.listing_id, data.start_time, data.end_time, product_type=data.booking_product_type)

@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = BookingService.create_booking(db, current_user.id, data)
    return serialize_booking(booking, current_user, db)

@router.get("/active", response_model=Optional[BookingOut])
def get_active_booking(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_b = (
        db.query(Booking)
        .filter(
            Booking.user_id == current_user.id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES)
        )
        .order_by(Booking.created_at.desc())
        .first()
    )
    if not active_b:
        return None
    return serialize_booking(active_b, current_user, db)

@router.get("/my-bookings", response_model=List[BookingOut])
def list_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()
    return [serialize_booking(b, current_user, db) for b in bookings]

@router.get("/host-bookings", response_model=List[BookingOut])
def list_host_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not host_profile:
        return []
    listing_ids = [l.id for l in host_profile.listings]
    if not listing_ids:
        return []

    bookings = (
        db.query(Booking)
        .filter(Booking.listing_id.in_(listing_ids))
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [serialize_booking(b, current_user, db) for b in bookings]

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking_detail(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return serialize_booking(booking, current_user, db)

# ==============================================================================
# VEHICLE HANDOVER & INSPECTION FLOW (DRIVER & HOST)
# ==============================================================================

@router.post("/{booking_id}/driver-arrived", response_model=BookingOut)
def mark_driver_arrived(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1: Driver arrives at parking location.
    Transitions: BOOKING_CREATED / CONFIRMED -> DRIVER_ARRIVED
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the driver can mark arrival")

    if booking.status not in [BookingStatusEnum.CONFIRMED, BookingStatusEnum.BOOKING_CREATED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot mark arrival for booking in status {booking.status}"
        )

    now = datetime.now(timezone.utc)
    booking.driver_arrived_at = now
    BookingService.update_booking_status(db, booking, BookingStatusEnum.DRIVER_ARRIVED)

    # Notify Host
    if booking.listing and booking.listing.host:
        host_user_id = booking.listing.host.user_id
        notif = Notification(
            user_id=host_user_id,
            title="🚗 Driver Arrived at Location",
            message=f"Driver for booking #{booking.booking_reference} has arrived and is conducting vehicle inspection.",
            notification_type="DRIVER_ARRIVED"
        )
        db.add(notif)
        db.commit()

    return serialize_booking(booking, current_user, db)


@router.post("/{booking_id}/submit-odometer", response_model=BookingOut)
def submit_odometer_inspection(
    booking_id: int,
    data: OdometerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 2: Driver submits Odometer/KM photo (Mandatory) + optional exterior photos.
    Transitions: DRIVER_ARRIVED -> ODOMETER_PHOTO_SUBMITTED -> KEY_HANDOVER_PENDING
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the driver can submit odometer reading")

    if booking.status not in [BookingStatusEnum.DRIVER_ARRIVED, BookingStatusEnum.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit odometer for booking in status {booking.status}"
        )

    if not data.odometer_photo_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Odometer/KM photo is required")
    if data.odometer_reading is None or data.odometer_reading < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid odometer KM reading is required")

    now = datetime.now(timezone.utc)
    booking.odometer_photo_url = data.odometer_photo_url
    booking.odometer_reading = float(data.odometer_reading)
    booking.odometer_ocr_text = data.odometer_ocr_text
    booking.odometer_submitted_at = now
    if data.exterior_photos:
        booking.exterior_photos = json.dumps(data.exterior_photos)
    if data.damage_notes:
        booking.damage_notes = data.damage_notes.strip()

    # Advance state to KEY_HANDOVER_PENDING
    BookingService.update_booking_status(db, booking, BookingStatusEnum.KEY_HANDOVER_PENDING)

    # Notify Host
    if booking.listing and booking.listing.host:
        host_user_id = booking.listing.host.user_id
        notif = Notification(
            user_id=host_user_id,
            title="🔑 Key Handover Pending",
            message=f"Driver #{booking.booking_reference} submitted {int(data.odometer_reading):,} KM odometer inspection. Please collect the key and confirm.",
            notification_type="KEY_HANDOVER_PENDING"
        )
        db.add(notif)
        db.commit()

    return serialize_booking(booking, current_user, db)


@router.post("/{booking_id}/confirm-key-received", response_model=BookingOut)
def confirm_key_received(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 3: Host confirms key received.
    Transitions: KEY_HANDOVER_PENDING -> KEY_RECEIVED -> PARKING_ACTIVE
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not host_profile or (booking.listing and host_profile.id != booking.listing.host_profile_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the space host can confirm key handover")

    allowed_prior_statuses = [
        BookingStatusEnum.KEY_HANDOVER_PENDING,
        BookingStatusEnum.ODOMETER_PHOTO_SUBMITTED,
        BookingStatusEnum.DRIVER_ARRIVED,
        BookingStatusEnum.CONFIRMED
    ]
    if booking.status not in allowed_prior_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm key handover for booking in status {booking.status}"
        )

    now = datetime.now(timezone.utc)
    booking.key_received_at = now

    # Initialize or update ParkingSession
    session = db.query(ParkingSession).filter(ParkingSession.booking_id == booking.id).first()
    if not session:
        session = ParkingSession(
            booking_id=booking.id,
            check_in_time=now,
            verification_method=VerificationMethodEnum.VERIFICATION_CODE,
            verified_by_user_id=current_user.id
        )
        db.add(session)
    else:
        session.check_in_time = now
        session.verified_by_user_id = current_user.id

    BookingService.update_booking_status(db, booking, BookingStatusEnum.PARKING_ACTIVE)

    # Notify Parker
    notif = Notification(
        user_id=booking.user_id,
        title="✅ Vehicle Key Received & Parking Active",
        message=f"Host has confirmed key receipt for booking #{booking.booking_reference}. Your vehicle is safely parked.",
        notification_type="PARKING_ACTIVE"
    )
    db.add(notif)
    db.commit()

    return serialize_booking(booking, current_user, db)


@router.post("/{booking_id}/request-collection", response_model=BookingOut)
def request_vehicle_collection(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 4: Driver returns and requests vehicle collection.
    Transitions: PARKING_ACTIVE / ACTIVE -> VEHICLE_COLLECTION_REQUESTED
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the driver can request vehicle collection")

    if booking.status not in [BookingStatusEnum.PARKING_ACTIVE, BookingStatusEnum.ACTIVE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request vehicle collection. Current status is {booking.status}"
        )

    now = datetime.now(timezone.utc)
    booking.collection_requested_at = now
    BookingService.update_booking_status(db, booking, BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED)

    # Notify Host immediately
    if booking.listing and booking.listing.host:
        host_user_id = booking.listing.host.user_id
        notif = Notification(
            user_id=host_user_id,
            title="🚗 Driver Requested Vehicle Collection",
            message=f"Driver for booking #{booking.booking_reference} has arrived to collect their vehicle. Please verify driver and provide Release OTP.",
            notification_type="VEHICLE_COLLECTION_REQUESTED"
        )
        db.add(notif)
        db.commit()

    return serialize_booking(booking, current_user, db)


@router.post("/{booking_id}/generate-release-otp", response_model=ReleaseOtpOut)
def generate_release_otp(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 5: Host verifies driver and generates one-time vehicle release OTP.
    CRITICAL SECURITY RULE: The host CANNOT generate OTP before VEHICLE_COLLECTION_REQUESTED stage.
    Stored hashed rather than plain text. Short 10-minute expiry. Rate limited against guessing.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not host_profile or (booking.listing and host_profile.id != booking.listing.host_profile_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the space host can generate the release OTP")

    # SECURITY CHECK
    if booking.status != BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The host cannot generate the vehicle-release OTP before the driver requests vehicle collection."
        )

    now = datetime.now(timezone.utc)
    otp = f"{random.randint(100000, 999999):06d}"

    # Stored hashed rather than plain text
    otp_hash = hashlib.sha256(f"{booking.id}:{otp}:{settings.SECRET_KEY}".encode()).hexdigest()

    booking.release_otp_hash = otp_hash
    booking.release_otp_expires_at = now + timedelta(minutes=10)
    booking.release_otp_attempts = 0
    db.commit()

    return {
        "booking_id": booking.id,
        "release_otp": otp,
        "expires_at": booking.release_otp_expires_at,
        "message": "One-time vehicle release OTP generated. Provide this code to the driver to complete handover."
    }


@router.post("/{booking_id}/verify-release-otp", response_model=BookingOut)
def verify_release_otp(
    booking_id: int,
    data: VerifyReleaseOtpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 6: Driver enters Host OTP to verify vehicle release and end trip.
    Security: One-time use, rate-limited against guessing (<5 attempts), invalid after use, hashed comparison.
    Transitions: VEHICLE_COLLECTION_REQUESTED -> RELEASE_OTP_VERIFIED -> VEHICLE_RELEASED -> COMPLETED
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the driver can verify release OTP")

    if booking.status != BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify release OTP. Booking status is {booking.status}"
        )

    if not booking.release_otp_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active release OTP found. Please ask the host to generate the OTP."
        )

    now = datetime.now(timezone.utc)

    # 1. Rate limiting against guessing (max 5 failed attempts)
    if (booking.release_otp_attempts or 0) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect OTP attempts. For security, this OTP is locked. Please request the host to generate a new OTP."
        )

    # 2. Short expiry check
    exp = booking.release_otp_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and now > exp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle-release OTP has expired. Please ask the host to generate a new OTP."
        )

    # 3. Hash comparison
    clean_otp = data.otp.strip()
    calculated_hash = hashlib.sha256(f"{booking.id}:{clean_otp}:{settings.SECRET_KEY}".encode()).hexdigest()

    if calculated_hash != booking.release_otp_hash:
        booking.release_otp_attempts = (booking.release_otp_attempts or 0) + 1
        attempts_left = max(0, 5 - booking.release_otp_attempts)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect Host OTP. {attempts_left} attempt(s) remaining."
        )

    # OTP is correct!
    # Invalidate OTP immediately (one-time use)
    booking.release_otp_hash = None
    booking.release_otp_expires_at = None
    booking.vehicle_released_at = now

    # Complete parking session and check out
    session = db.query(ParkingSession).filter(ParkingSession.booking_id == booking.id).first()
    if session:
        session.check_out_time = now
        b_end = booking.end_time
        if b_end and b_end.tzinfo is None:
            b_end = b_end.replace(tzinfo=timezone.utc)
        if b_end and now > b_end:
            import math
            overtime_secs = (now - b_end).total_seconds()
            overtime_hrs = max(1.0, math.ceil(overtime_secs / 3600.0))
            rate = booking.listing.pricing_rule.hourly_price if (booking.listing and booking.listing.pricing_rule) else 30.0
            session.overtime_hours = overtime_hrs
            session.overtime_fee = overtime_hrs * rate
    else:
        session = ParkingSession(
            booking_id=booking.id,
            check_in_time=booking.key_received_at or now,
            check_out_time=now,
            verification_method=VerificationMethodEnum.VERIFICATION_CODE,
            verified_by_user_id=booking.user_id
        )
        db.add(session)

    BookingService.update_booking_status(db, booking, BookingStatusEnum.COMPLETED)

    # Notify Host of successful release
    if booking.listing and booking.listing.host:
        host_user_id = booking.listing.host.user_id
        notif = Notification(
            user_id=host_user_id,
            title="🏁 Vehicle Released & Trip Completed",
            message=f"Driver for booking #{booking.booking_reference} successfully verified OTP. Vehicle handed over and trip marked completed.",
            notification_type="COMPLETED"
        )
        db.add(notif)
        db.commit()

    return serialize_booking(booking, current_user, db)


@router.post("/{booking_id}/open-dispute", response_model=BookingOut)
def open_booking_dispute(
    booking_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Transitions to DISPUTE_OPENED if an issue or damage arises during handover.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.cancellation_reason = reason
    BookingService.update_booking_status(db, booking, BookingStatusEnum.DISPUTE_OPENED, reason=reason)
    return serialize_booking(booking, current_user, db)


# ==============================================================================
# EXISTING ACTIONS & COMPATIBILITY
# ==============================================================================

@router.post("/{booking_id}/end-parking", response_model=BookingOut)
def end_parking(
    booking_id: int,
    data: Optional[EndParkingRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    End Parking Flow:
    1. If called without OTP:
       Transitions status to VEHICLE_COLLECTION_REQUESTED and alerts space owner to issue 6-digit release OTP.
    2. If called with OTP:
       Validates space owner OTP against secure hash, rate-limits attempts, and ONLY THEN ends trip (COMPLETED).
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to end this parking session")

    # If already completed or released
    if booking.status in [BookingStatusEnum.COMPLETED, BookingStatusEnum.VEHICLE_RELEASED]:
        return serialize_booking(booking, current_user, db)

    now = datetime.now(timezone.utc)

    # CASE A: Driver submits Owner OTP to conclude trip
    if data and data.otp and data.otp.strip():
        otp_to_verify = data.otp.strip()

        if booking.status != BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED:
            # Move to collection requested if not yet in this stage
            BookingService.update_booking_status(db, booking, BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED)
            booking.collection_requested_at = now
            db.commit()

        if not booking.release_otp_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active release OTP found. The space owner must generate the OTP first."
            )

        # Rate limiting check
        if (booking.release_otp_attempts or 0) >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect OTP attempts. For security, please ask the space owner to generate a new OTP."
            )

        # Expiry check (10 min)
        exp = booking.release_otp_expires_at
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and now > exp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owner release OTP has expired. Please ask the space owner to generate a new OTP."
            )

        # Secure hash comparison
        calculated_hash = hashlib.sha256(f"{booking.id}:{otp_to_verify}:{settings.SECRET_KEY}".encode()).hexdigest()
        if calculated_hash != booking.release_otp_hash:
            booking.release_otp_attempts = (booking.release_otp_attempts or 0) + 1
            attempts_left = max(0, 5 - booking.release_otp_attempts)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect Owner OTP. {attempts_left} attempt(s) remaining."
            )

        # OTP is correct! Complete session and mark trip COMPLETED
        booking.release_otp_hash = None
        booking.release_otp_expires_at = None
        booking.vehicle_released_at = now

        session = db.query(ParkingSession).filter(ParkingSession.booking_id == booking.id).first()
        if session:
            session.check_out_time = now
            b_end = booking.end_time
            if b_end and b_end.tzinfo is None:
                b_end = b_end.replace(tzinfo=timezone.utc)
            if b_end and now > b_end:
                import math
                overtime_secs = (now - b_end).total_seconds()
                overtime_hrs = max(1.0, math.ceil(overtime_secs / 3600.0))
                rate = booking.listing.pricing_rule.hourly_price if (booking.listing and booking.listing.pricing_rule) else 30.0
                session.overtime_hours = overtime_hrs
                session.overtime_fee = overtime_hrs * rate
        else:
            session = ParkingSession(
                booking_id=booking.id,
                check_in_time=booking.key_received_at or now,
                check_out_time=now,
                verification_method=VerificationMethodEnum.VERIFICATION_CODE,
                verified_by_user_id=current_user.id
            )
            db.add(session)

        BookingService.update_booking_status(db, booking, BookingStatusEnum.COMPLETED)

        # Notify Owner
        if booking.listing and booking.listing.host:
            host_user_id = booking.listing.host.user_id
            notif = Notification(
                user_id=host_user_id,
                title="🏁 Vehicle Released & Trip Completed",
                message=f"Driver for booking #{booking.booking_reference} verified Owner OTP. Vehicle released and trip marked completed.",
                notification_type="COMPLETED"
            )
            db.add(notif)
            db.commit()

        return serialize_booking(booking, current_user, db)

    # CASE B: Driver gives "End Parking" -> Initiates Owner OTP Requirement
    allowed_statuses = [
        BookingStatusEnum.ACTIVE,
        BookingStatusEnum.CONFIRMED,
        BookingStatusEnum.PARKING_ACTIVE,
        BookingStatusEnum.KEY_RECEIVED,
        BookingStatusEnum.KEY_HANDOVER_PENDING,
        BookingStatusEnum.ODOMETER_PHOTO_SUBMITTED,
        BookingStatusEnum.DRIVER_ARRIVED,
        BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED
    ]
    if booking.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end parking for booking in {booking.status} status"
        )

    # Transition to VEHICLE_COLLECTION_REQUESTED
    if booking.status != BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED:
        booking.collection_requested_at = now
        BookingService.update_booking_status(db, booking, BookingStatusEnum.VEHICLE_COLLECTION_REQUESTED)

        # Alert Space Owner to issue Release OTP
        if booking.listing and booking.listing.host:
            host_user_id = booking.listing.host.user_id
            notif = Notification(
                user_id=host_user_id,
                title="🚗 Driver Requested to End Parking",
                message=f"Driver for booking #{booking.booking_reference} has requested to End Parking. Please provide the 6-digit release OTP to the driver to complete the checkout.",
                notification_type="VEHICLE_COLLECTION_REQUESTED"
            )
            db.add(notif)
            db.commit()

    return serialize_booking(booking, current_user, db)


@router.get("/{booking_id}/cancellation-preview", response_model=CancellationPreviewOut)
def preview_cancellation(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this booking")

    return BookingService.calculate_cancellation_refund(db, booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = BookingService.cancel_booking(db, booking_id, current_user.id, reason=reason, cancelled_by="PARKER")
    return serialize_booking(booking, current_user, db)


@router.post("/host/{booking_id}/cancel", response_model=BookingOut)
def host_cancel_booking(
    booking_id: int,
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = BookingService.host_cancel_booking(db, booking_id, current_user.id, reason=reason)
    return serialize_booking(booking, current_user, db)


@router.get("/notifications/my")
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()


@router.post("/{booking_id}/request-refund", response_model=BookingOut)
def request_refund(
    booking_id: int,
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = BookingService.request_refund(db, booking_id, current_user.id, reason=reason)
    return serialize_booking(booking, current_user, db)
