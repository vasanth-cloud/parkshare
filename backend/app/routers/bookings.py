from typing import List, Optional

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.booking import PriceCalculationRequest, PriceBreakdown, BookingCreate, BookingOut, CancellationPreviewOut
from app.services.booking_service import BookingService
from app.services.listing_service import ListingService
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatusEnum

router = APIRouter(prefix="/bookings", tags=["Bookings"])

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
    return get_booking_detail(booking.id, current_user, db)

@router.get("/active", response_model=Optional[BookingOut])
def get_active_booking(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_b = (
        db.query(Booking)
        .filter(
            Booking.user_id == current_user.id,
            Booking.status.in_([BookingStatusEnum.ACTIVE, BookingStatusEnum.CONFIRMED])
        )
        .order_by(Booking.created_at.desc())
        .first()
    )

    if not active_b:
        return None
    return get_booking_detail(active_b.id, current_user, db)

@router.get("/my-bookings", response_model=List[BookingOut])
def list_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()
    
    out = []
    for b in bookings:
        is_confirmed = b.status in [BookingStatusEnum.CONFIRMED, BookingStatusEnum.ACTIVE, BookingStatusEnum.COMPLETED]
        listing_detail = ListingService.get_listing_by_id(db, b.listing_id, current_user_id=current_user.id, is_confirmed_parker=is_confirmed)
        
        host_user = b.listing.host.user if (b.listing and b.listing.host and b.listing.host.user) else None
        h_name = host_user.full_name if host_user else "Ravi"
        h_phone = host_user.phone_number if (host_user and host_user.phone_number) else "+91 98765 43210"

        b_dict = {
            "id": b.id,
            "booking_reference": b.booking_reference,
            "user_id": b.user_id,
            "listing_id": b.listing_id,
            "vehicle_id": b.vehicle_id,
            "start_time": b.start_time,
            "end_time": b.end_time,
            "verification_code": b.verification_code if is_confirmed else None,
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
            "listing": listing_detail,
            "vehicle": b.vehicle,
            "host_name": h_name,
            "host_phone": h_phone,
            "created_at": b.created_at
        }
        out.append(b_dict)
    return out

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking_detail(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    is_confirmed = booking.status in [BookingStatusEnum.CONFIRMED, BookingStatusEnum.ACTIVE, BookingStatusEnum.COMPLETED]
    listing_detail = ListingService.get_listing_by_id(db, booking.listing_id, current_user_id=current_user.id, is_confirmed_parker=is_confirmed)

    host_user = booking.listing.host.user if (booking.listing and booking.listing.host and booking.listing.host.user) else None
    h_name = host_user.full_name if host_user else "Ravi"
    h_phone = host_user.phone_number if (host_user and host_user.phone_number) else "+91 98765 43210"

    return {
        "id": booking.id,
        "booking_reference": booking.booking_reference,
        "user_id": booking.user_id,
        "listing_id": booking.listing_id,
        "vehicle_id": booking.vehicle_id,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "verification_code": booking.verification_code if is_confirmed else None,
        "qr_token": booking.qr_token,
        "parking_fee": booking.parking_fee,
        "platform_fee": booking.platform_fee,
        "tax": booking.tax,
        "total_amount": booking.total_amount,
        "status": booking.status,
        "cancellation_reason": booking.cancellation_reason,
        "cancelled_by": booking.cancelled_by,
        "cancellation_tier": booking.cancellation_tier,
        "refund_amount": booking.refund_amount or 0.0,
        "cancelled_at": booking.cancelled_at,
        "listing": listing_detail,
        "vehicle": booking.vehicle,
        "host_name": h_name,
        "host_phone": h_phone,
        "created_at": booking.created_at
    }

@router.post("/{booking_id}/end-parking", response_model=BookingOut)
def end_parking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timezone
    from app.models.booking import ParkingSession, VerificationMethodEnum
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to end this parking session")
    if booking.status not in [BookingStatusEnum.ACTIVE, BookingStatusEnum.CONFIRMED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot end parking for booking in {booking.status} status")

    now = datetime.now(timezone.utc)
    session = db.query(ParkingSession).filter(ParkingSession.booking_id == booking.id).first()
    if session:
        session.check_out_time = now
    else:
        session = ParkingSession(
            booking_id=booking.id,
            check_in_time=now,
            check_out_time=now,
            verification_method=VerificationMethodEnum.VERIFICATION_CODE,
            verified_by_user_id=current_user.id
        )
        db.add(session)

    BookingService.update_booking_status(db, booking, BookingStatusEnum.COMPLETED)
    return get_booking_detail(booking.id, current_user, db)


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
    return get_booking_detail(booking.id, current_user, db)

@router.post("/host/{booking_id}/cancel", response_model=BookingOut)
def host_cancel_booking(
    booking_id: int,
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = BookingService.host_cancel_booking(db, booking_id, current_user.id, reason=reason)
    return get_booking_detail(booking.id, current_user, db)

@router.get("/notifications/my")
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.booking import Notification
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()

@router.post("/{booking_id}/request-refund", response_model=BookingOut)
def request_refund(
    booking_id: int,
    reason: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = BookingService.request_refund(db, booking_id, current_user.id, reason=reason)
    return get_booking_detail(booking.id, current_user, db)
