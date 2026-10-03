import hmac
import hashlib
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.booking import Booking, BookingStatusEnum
from app.models.payment import Payment, PaymentStatusEnum, PaymentProviderEnum
from app.models.user import HostProfile
from app.core.config import settings

class PaymentService:
    @staticmethod
    def create_payment_order(db: Session, booking_id: int, user_id: int) -> dict:
        booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        if booking.status not in [BookingStatusEnum.PENDING_PAYMENT, BookingStatusEnum.BOOKING_CREATED]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Booking is in {booking.status} status")

        # Check 1-minute session timeout
        now = datetime.now(timezone.utc)
        if booking.payment_expires_at:
            exp = booking.payment_expires_at if booking.payment_expires_at.tzinfo else booking.payment_expires_at.replace(tzinfo=timezone.utc)
            if exp < now:
                booking.status = BookingStatusEnum.EXPIRED
                booking.cancellation_reason = "Payment session timed out (1-minute limit reached)"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment session has expired (1-minute limit reached). Please place a new reservation."
                )

        amount_in_paise = max(100, int(round(booking.total_amount * 100)))  # Minimum 100 paise (Rs 1)
        order_id = f"order_ps_{random.randint(1000000, 9999999)}"

        # Generate real Razorpay Order ID via Razorpay API
        if not settings.RAZORPAY_MOCK_MODE:
            try:
                import httpx
                res = httpx.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                    json={
                        "amount": amount_in_paise,
                        "currency": "INR",
                        "receipt": f"rcpt_{booking.id}_{random.randint(1000, 9999)}",
                        "notes": {
                            "booking_id": str(booking.id),
                            "booking_reference": booking.booking_reference,
                            "user_id": str(user_id)
                        }
                    },
                    timeout=10.0
                )
                if res.status_code in [200, 201]:
                    order_data = res.json()
                    order_id = order_data.get("id", order_id)
                else:
                    print(f"Razorpay order creation response ({res.status_code}): {res.text}")
            except Exception as e:
                print(f"Razorpay order creation exception: {e}")

        # Create or update Payment record
        existing_payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
        if existing_payment:
            existing_payment.order_id = order_id
            existing_payment.amount = booking.total_amount
            payment = existing_payment
        else:
            payment = Payment(
                booking_id=booking.id,
                order_id=order_id,
                provider=PaymentProviderEnum.MOCK if settings.RAZORPAY_MOCK_MODE else PaymentProviderEnum.RAZORPAY,
                amount=booking.total_amount,
                currency="INR",
                status=PaymentStatusEnum.PENDING,
                host_gross_earning=booking.parking_fee,
                platform_commission=booking.platform_fee,
                tax_collected=booking.tax
            )
            db.add(payment)

        db.commit()

        return {
            "id": payment.id,
            "booking_id": booking.id,
            "order_id": order_id,
            "amount": booking.total_amount,
            "amount_in_paise": amount_in_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "mock_mode": settings.RAZORPAY_MOCK_MODE,
            "booking_reference": booking.booking_reference,
            "space_title": booking.listing.title if (booking.listing and booking.listing.title) else "ParkShare Space"
        }

    @staticmethod
    def verify_payment(db: Session, booking_id: int, user_id: int, order_id: str, payment_id: str, signature: str) -> Payment:
        booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        payment = db.query(Payment).filter(Payment.booking_id == booking_id, Payment.order_id == order_id).first()
        if not payment:
            # Fallback check by booking_id
            payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
            if not payment:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order record not found")

        # Verify Razorpay signature
        if not settings.RAZORPAY_MOCK_MODE:
            msg = f"{order_id}|{payment_id}".encode("utf-8")
            generated_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
                msg,
                hashlib.sha256
            ).hexdigest()

            if generated_signature != signature:
                payment.status = PaymentStatusEnum.FAILED
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment verification failed: Invalid Razorpay signature"
                )

        # Check 1-minute session timeout (with 15s grace for network latency)
        now = datetime.now(timezone.utc)
        if booking.payment_expires_at:
            from datetime import timedelta
            exp = booking.payment_expires_at if booking.payment_expires_at.tzinfo else booking.payment_expires_at.replace(tzinfo=timezone.utc)
            if (exp + timedelta(seconds=15)) < now and booking.status != BookingStatusEnum.CONFIRMED:
                booking.status = BookingStatusEnum.EXPIRED
                booking.cancellation_reason = "Payment session timed out (1-minute limit reached)"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment session timed out (1-minute limit reached). Payment could not be confirmed."
                )

        # Check that space has capacity before confirming
        from app.models.listing import ParkingListing
        listing = db.query(ParkingListing).filter(ParkingListing.id == booking.listing_id).first()
        if listing:
            from sqlalchemy import and_, or_
            confirmed_occupancy = db.query(Booking).filter(
                Booking.listing_id == booking.listing_id,
                Booking.id != booking.id,
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
                    and_(Booking.start_time < booking.end_time, Booking.end_time > booking.start_time),
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
            if confirmed_occupancy >= listing.capacity:
                payment.status = PaymentStatusEnum.FAILED
                booking.status = BookingStatusEnum.CANCELLED
                booking.cancellation_reason = "Overbooked before payment confirmation - refund pending"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This parking space was just confirmed by another customer. Payment could not be confirmed."
                )

        # Payment Verified Successfully
        payment.payment_id = payment_id
        payment.signature = signature
        payment.status = PaymentStatusEnum.PAID

        # Update Booking Status to CONFIRMED
        from app.services.booking_service import BookingService
        BookingService.update_booking_status(db, booking, BookingStatusEnum.CONFIRMED)

        # Add Host Gross Earnings to Host Profile
        if booking.listing and booking.listing.host_profile_id:
            host_profile = db.query(HostProfile).filter(HostProfile.id == booking.listing.host_profile_id).first()
            if host_profile:
                host_profile.total_earnings = (host_profile.total_earnings or 0.0) + payment.host_gross_earning

        db.commit()
        db.refresh(payment)
        return payment
