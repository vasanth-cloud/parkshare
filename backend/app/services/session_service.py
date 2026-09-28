import math
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.booking import Booking, ParkingSession, BookingStatusEnum, VerificationMethodEnum
from app.models.listing import ParkingListing
from app.models.user import HostProfile

class SessionService:
    @staticmethod
    def check_in(
        db: Session,
        host_user_id: int,
        qr_token: str = None,
        booking_reference: str = None,
        verification_code: str = None
    ) -> ParkingSession:
        # Find Booking by QR Token or PIN Code
        query = db.query(Booking)
        if qr_token:
            booking = query.filter(Booking.qr_token == qr_token.strip()).first()
            method = VerificationMethodEnum.QR_CODE
        elif verification_code:
            # Look up booking by 4-digit verification code or reference + PIN
            q = query.filter(Booking.verification_code == verification_code.strip())
            if booking_reference:
                q = q.filter(Booking.booking_reference == booking_reference.upper().strip())
            booking = q.first()
            method = VerificationMethodEnum.VERIFICATION_CODE
        elif booking_reference:
            booking = query.filter(Booking.booking_reference == booking_reference.upper().strip()).first()
            method = VerificationMethodEnum.VERIFICATION_CODE
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide QR token or 4-digit backup PIN code")

        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found or invalid credentials")

        # Verify host owns the listing
        host_profile = db.query(HostProfile).filter(HostProfile.user_id == host_user_id).first()
        if not host_profile or host_profile.id != booking.listing.host_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to check in parkers for this space")

        if booking.status != BookingStatusEnum.CONFIRMED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot check in. Booking status is {booking.status}")

        now = datetime.now(timezone.utc)

        session = db.query(ParkingSession).filter(ParkingSession.booking_id == booking.id).first()
        if not session:
            session = ParkingSession(
                booking_id=booking.id,
                check_in_time=now,
                verification_method=method,
                verified_by_user_id=host_user_id
            )
            db.add(session)
        else:
            session.check_in_time = now
            session.verification_method = method
            session.verified_by_user_id = host_user_id

        from app.services.booking_service import BookingService
        BookingService.update_booking_status(db, booking, BookingStatusEnum.ACTIVE)
        db.refresh(session)
        return session

    @staticmethod
    def check_out(db: Session, host_user_id: int, booking_id: int) -> ParkingSession:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        host_profile = db.query(HostProfile).filter(HostProfile.user_id == host_user_id).first()
        if not host_profile or host_profile.id != booking.listing.host_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to check out parkers for this space")

        if booking.status != BookingStatusEnum.ACTIVE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot check out. Booking status is {booking.status}")

        session = db.query(ParkingSession).filter(ParkingSession.booking_id == booking.id).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active parking session found")

        now = datetime.now(timezone.utc)
        session.check_out_time = now

        # Calculate overtime if actual exit is after expected end_time
        b_end_time = booking.end_time
        if b_end_time and b_end_time.tzinfo is None:
            b_end_time = b_end_time.replace(tzinfo=timezone.utc)

        if b_end_time and now > b_end_time:
            overtime_seconds = (now - b_end_time).total_seconds()
            overtime_hours = max(1.0, math.ceil(overtime_seconds / 3600.0))
            hourly_rate = booking.listing.pricing_rule.hourly_price if booking.listing.pricing_rule else 30.0
            
            session.overtime_hours = overtime_hours
            session.overtime_fee = overtime_hours * hourly_rate

        from app.services.booking_service import BookingService
        BookingService.update_booking_status(db, booking, BookingStatusEnum.COMPLETED)
        db.refresh(session)
        return session
