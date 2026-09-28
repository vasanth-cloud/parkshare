import hmac
import hashlib
import random
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

        if booking.status != BookingStatusEnum.PENDING_PAYMENT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Booking is in {booking.status} status")

        order_id = f"order_ps_{random.randint(1000000, 9999999)}"
        amount_in_paise = int(booking.total_amount * 100)

        # Create or update Payment record
        existing_payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
        if existing_payment:
            existing_payment.order_id = order_id
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
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "mock_mode": settings.RAZORPAY_MOCK_MODE
        }

    @staticmethod
    def verify_payment(db: Session, booking_id: int, user_id: int, order_id: str, payment_id: str, signature: str) -> Payment:
        booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        payment = db.query(Payment).filter(Payment.booking_id == booking_id, Payment.order_id == order_id).first()
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order record not found")

        # Verify Signature (Mock Mode accepts mock signatures or auto succeeds)
        if not settings.RAZORPAY_MOCK_MODE:
            generated_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                f"{order_id}|{payment_id}".encode(),
                hashlib.sha256
            ).hexdigest()

            if generated_signature != signature:
                payment.status = PaymentStatusEnum.FAILED
                db.commit()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment verification failed (Invalid signature)")

        # Payment Verified Successfully
        payment.payment_id = payment_id
        payment.signature = signature
        payment.status = PaymentStatusEnum.PAID

        # Update Booking Status to CONFIRMED
        from app.services.booking_service import BookingService
        BookingService.update_booking_status(db, booking, BookingStatusEnum.CONFIRMED)

        # Add Host Gross Earnings to Host Profile
        host_profile = db.query(HostProfile).filter(HostProfile.id == booking.listing.host_profile_id).first()
        if host_profile:
            host_profile.total_earnings += payment.host_gross_earning
            db.commit()
        db.refresh(payment)
        return payment
