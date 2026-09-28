import math
import random
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.listing import ParkingListing, PricingRule, ListingStatusEnum
from app.models.booking import Booking, BookingStatusEnum
from app.schemas.booking import PriceBreakdown, BookingCreate
from app.core.config import settings

def generate_booking_reference() -> str:
    return f"PKR-{random.randint(100000, 999999)}"

def generate_verification_code() -> str:
    return str(random.randint(1000, 9999))

VALID_TRANSITIONS = {
    BookingStatusEnum.PENDING_APPROVAL: {
        BookingStatusEnum.PENDING_PAYMENT,
        BookingStatusEnum.CANCELLED
    },
    BookingStatusEnum.PENDING_PAYMENT: {
        BookingStatusEnum.CONFIRMED,
        BookingStatusEnum.EXPIRED,
        BookingStatusEnum.CANCELLED
    },
    BookingStatusEnum.CONFIRMED: {
        BookingStatusEnum.ACTIVE,
        BookingStatusEnum.COMPLETED,
        BookingStatusEnum.CANCELLED,
        BookingStatusEnum.REFUND_PENDING
    },

    BookingStatusEnum.ACTIVE: {
        BookingStatusEnum.COMPLETED,
        BookingStatusEnum.CANCELLED,
        BookingStatusEnum.REFUND_PENDING
    },
    BookingStatusEnum.CANCELLED: {
        BookingStatusEnum.REFUND_PENDING
    },
    BookingStatusEnum.REFUND_PENDING: {
        BookingStatusEnum.REFUNDED
    },
    BookingStatusEnum.COMPLETED: set(),
    BookingStatusEnum.EXPIRED: set(),
    BookingStatusEnum.REFUNDED: set()
}

from app.models.listing import ParkingListing, PricingRule, ListingStatusEnum, BookingProductTypeEnum

class BookingService:
    @staticmethod
    def validate_transition(current_status: BookingStatusEnum, new_status: BookingStatusEnum) -> None:
        allowed = VALID_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {current_status} to {new_status}"
            )

    @staticmethod
    def update_booking_status(
        db: Session,
        booking: Booking,
        new_status: BookingStatusEnum,
        reason: str = None,
        cancelled_by: str = None
    ) -> Booking:
        BookingService.validate_transition(booking.status, new_status)
        booking.status = new_status
        if reason:
            booking.cancellation_reason = reason
        if cancelled_by:
            booking.cancelled_by = cancelled_by
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def calculate_price(
        db: Session,
        listing_id: int,
        start_time: datetime,
        end_time: datetime,
        product_type: BookingProductTypeEnum = BookingProductTypeEnum.HOURLY
    ) -> PriceBreakdown:
        if end_time <= start_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time")

        listing = db.query(ParkingListing).filter(ParkingListing.id == listing_id).first()
        if not listing or not listing.pricing_rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing or pricing rule not found")

        duration_seconds = (end_time - start_time).total_seconds()
        duration_hours = max(1.0, math.ceil(duration_seconds / 3600.0))
        hourly_rate = listing.pricing_rule.hourly_price or 40.0

        p_type = product_type or BookingProductTypeEnum.HOURLY
        plan_name = "Short Visit (Hourly)"

        if p_type == BookingProductTypeEnum.DAILY:
            duration_days = max(1.0, math.ceil(duration_seconds / 86400.0))
            daily_rate = listing.pricing_rule.daily_price or 250.0
            parking_fee = duration_days * daily_rate
            plan_name = "Full Day Parking"
        elif p_type == BookingProductTypeEnum.MULTI_DAY:
            duration_days = max(1.0, math.ceil(duration_seconds / 86400.0))
            daily_rate = listing.pricing_rule.daily_price or 250.0
            discount = (listing.pricing_rule.multi_day_discount_percent or 15.0) / 100.0
            parking_fee = round(duration_days * daily_rate * (1.0 - discount), 2)
            plan_name = f"Multi-Day Visitor ({int(duration_days)} Days - {int(discount*100)}% Off)"
        elif p_type == BookingProductTypeEnum.MONTHLY_FULL:
            months = max(1.0, round(duration_seconds / (30.0 * 86400.0), 1))
            monthly_rate = listing.pricing_rule.monthly_price or 3500.0
            parking_fee = round(months * monthly_rate, 2)
            plan_name = "Monthly Pass (24/7 Access)"
        elif p_type == BookingProductTypeEnum.MONTHLY_COMMUTER:
            months = max(1.0, round(duration_seconds / (30.0 * 86400.0), 1))
            commuter_rate = listing.pricing_rule.monthly_commuter_price or 2200.0
            parking_fee = round(months * commuter_rate, 2)
            plan_name = "Monthly Commuter (Mon-Fri 8am-8pm)"
        else: # HOURLY
            if duration_hours >= 24 and listing.pricing_rule.daily_price:
                days = duration_hours / 24.0
                parking_fee = round(days * listing.pricing_rule.daily_price, 2)
                plan_name = "Daily Rate Optimized"
            else:
                parking_fee = round(duration_hours * hourly_rate, 2)
                plan_name = "Hourly Short Visit"

        platform_fee = round(parking_fee * (settings.PLATFORM_COMMISSION_PERCENTAGE / 100.0), 2)
        tax = round((parking_fee + platform_fee) * (settings.TAX_PERCENTAGE / 100.0), 2)
        total_amount = round(parking_fee + platform_fee + tax, 2)

        return PriceBreakdown(
            duration_hours=duration_hours,
            hourly_rate=hourly_rate,
            parking_fee=parking_fee,
            platform_fee=platform_fee,
            tax=tax,
            total_amount=total_amount,
            booking_product_type=p_type,
            plan_name=plan_name
        )

    @staticmethod
    def create_booking(db: Session, user_id: int, data: BookingCreate) -> Booking:
        # -------------------------------------------------------------------
        # STRICT CONCURRENCY LOCK & DOUBLE-BOOKING PROTECTION
        # -------------------------------------------------------------------
        listing = (
            db.query(ParkingListing)
            .with_for_update()  # PostgreSQL SELECT FOR UPDATE row lock
            .filter(ParkingListing.id == data.listing_id)
            .first()
        )
        if not listing or listing.status != ListingStatusEnum.ACTIVE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is not available for booking")

        # 2. Count existing active/confirmed overlapping bookings within the requested time window
        overlapping_count = (
            db.query(Booking)
            .filter(
                Booking.listing_id == data.listing_id,
                Booking.status.in_([
                    BookingStatusEnum.CONFIRMED,
                    BookingStatusEnum.ACTIVE,
                    BookingStatusEnum.PENDING_PAYMENT,
                    BookingStatusEnum.PENDING_APPROVAL
                ]),
                Booking.start_time < data.end_time,
                Booking.end_time > data.start_time
            )
            .count()
        )

        # 3. Reject if active overlap count meets or exceeds space capacity
        if overlapping_count >= listing.capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This parking space is fully reserved for the selected time window."
            )

        p_type = getattr(data, 'booking_product_type', None) or BookingProductTypeEnum.HOURLY
        # Calculate Price Breakdown
        price_info = BookingService.calculate_price(db, data.listing_id, data.start_time, data.end_time, product_type=p_type)

        # Generate unique Reference, Verification PIN, QR Token, and Space Slot #
        reference = generate_booking_reference()
        pin_code = generate_verification_code()
        qr_token = str(uuid.uuid4())
        space_slot = f"Slot A{(overlapping_count + 1):02d}"

        initial_status = (
            BookingStatusEnum.PENDING_APPROVAL
            if listing.booking_mode == "MANUAL_APPROVAL"
            else BookingStatusEnum.PENDING_PAYMENT
        )

        booking = Booking(
            booking_reference=reference,
            user_id=user_id,
            listing_id=data.listing_id,
            vehicle_id=data.vehicle_id,
            booking_product_type=p_type,
            space_number=space_slot,
            start_time=data.start_time,
            end_time=data.end_time,
            verification_code=pin_code,
            qr_token=qr_token,
            parking_fee=price_info.parking_fee,
            platform_fee=price_info.platform_fee,
            tax=price_info.tax,
            total_amount=price_info.total_amount,
            status=initial_status
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def calculate_cancellation_refund(db: Session, booking: Booking) -> "CancellationPreviewOut":
        from app.schemas.booking import CancellationPreviewOut
        from app.models.booking import CancellationTierEnum

        start_time = booking.start_time
        if start_time.tzinfo is not None:
            now = datetime.now(timezone.utc)
        else:
            now = datetime.now()

        hours_until_start = (start_time - now).total_seconds() / 3600.0


        # Unpaid bookings have 0 paid
        if booking.status in [BookingStatusEnum.PENDING_PAYMENT, BookingStatusEnum.PENDING_APPROVAL]:
            return CancellationPreviewOut(
                booking_id=booking.id,
                hours_until_start=round(hours_until_start, 2),
                cancellation_tier=CancellationTierEnum.FULL_REFUND,
                total_paid=0.0,
                refund_percentage=100.0,
                refund_amount=0.0,
                cancellation_fee=0.0,
                policy_description="Unpaid booking - 100% cancellation with ₹0 charged."
            )

        total_paid = booking.total_amount

        if hours_until_start >= 2.0:
            tier = CancellationTierEnum.FULL_REFUND
            refund_pct = 100.0
            refund_amt = total_paid
            fee = 0.0
            desc = "Early cancellation (> 2h before start) - 100% Full Refund eligible."
        elif hours_until_start > 0:
            tier = CancellationTierEnum.PARTIAL_REFUND
            refund_pct = 50.0
            refund_amt = round(total_paid * 0.5, 2)
            fee = round(total_paid * 0.5, 2)
            desc = "Late cancellation (< 2h before start) - 50% Refund eligible (50% fee retained for host guarantee)."
        else:
            tier = CancellationTierEnum.NO_REFUND
            refund_pct = 0.0
            refund_amt = 0.0
            fee = total_paid
            desc = "Post-start / No-show - 0% Refund per platform policy."

        return CancellationPreviewOut(
            booking_id=booking.id,
            hours_until_start=round(hours_until_start, 2),
            cancellation_tier=tier,
            total_paid=total_paid,
            refund_percentage=refund_pct,
            refund_amount=refund_amt,
            cancellation_fee=fee,
            policy_description=desc
        )

    @staticmethod
    def cancel_booking(db: Session, booking_id: int, user_id: int, reason: str = None, cancelled_by: str = "PARKER") -> Booking:
        from app.models.payment import Payment, PaymentStatusEnum, Refund
        from app.models.user import HostProfile

        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        if cancelled_by == "PARKER" and booking.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to cancel this booking")

        # Compute Refund Tier
        preview = BookingService.calculate_cancellation_refund(db, booking)
        now = datetime.now(timezone.utc)

        booking.cancellation_tier = preview.cancellation_tier
        booking.refund_amount = preview.refund_amount
        booking.cancelled_at = now
        booking.cancellation_reason = reason
        booking.cancelled_by = cancelled_by

        # If booking was paid (CONFIRMED), adjust payment & host earnings
        payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
        if payment and payment.status == PaymentStatusEnum.PAID:
            if preview.refund_amount > 0:
                payment.status = PaymentStatusEnum.REFUNDED if preview.refund_percentage == 100.0 else PaymentStatusEnum.PARTIALLY_REFUNDED
                # Create Refund record
                refund_ref = f"REF-{uuid.uuid4().hex[:8].upper()}"
                refund = Refund(
                    payment_id=payment.id,
                    refund_reference=refund_ref,
                    amount=preview.refund_amount,
                    reason=reason or preview.policy_description,
                    status="PROCESSED"
                )
                db.add(refund)

                # Adjust Host Earnings if refund occurred
                if booking.listing and booking.listing.host:
                    host_profile = booking.listing.host
                    deduction = booking.parking_fee * (preview.refund_percentage / 100.0)
                    host_profile.total_earnings = max(0.0, host_profile.total_earnings - deduction)

        target_status = BookingStatusEnum.CANCELLED
        return BookingService.update_booking_status(
            db, booking, target_status, reason=reason, cancelled_by=cancelled_by
        )

    @staticmethod
    def approve_booking(db: Session, booking_id: int, host_user_id: int) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        return BookingService.update_booking_status(db, booking, BookingStatusEnum.PENDING_PAYMENT)

    @staticmethod
    def expire_unpaid_booking(db: Session, booking_id: int) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        return BookingService.update_booking_status(
            db, booking, BookingStatusEnum.EXPIRED, reason="Payment window expired"
        )

    @staticmethod
    def request_refund(db: Session, booking_id: int, user_id: int, reason: str = None) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        if booking.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to request a refund for this booking")

        return BookingService.update_booking_status(
            db, booking, BookingStatusEnum.REFUND_PENDING, reason=reason
        )

    @staticmethod
    def process_refund(db: Session, booking_id: int, admin_user_id: int) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        return BookingService.update_booking_status(db, booking, BookingStatusEnum.REFUNDED)

    @staticmethod
    def host_cancel_booking(db: Session, booking_id: int, host_user_id: int, reason: str = None) -> Booking:
        from app.models.payment import Payment, PaymentStatusEnum, Refund
        from app.models.user import HostProfile
        from app.models.booking import HostCancellationRecord, Notification, CancellationTierEnum

        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        host_profile = db.query(HostProfile).filter(HostProfile.user_id == host_user_id).first()
        if not host_profile or host_profile.id != booking.listing.host_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to cancel this booking")

        if booking.status in [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Booking cannot be cancelled in status {booking.status}")

        now = datetime.now(timezone.utc)
        start_time = booking.start_time
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        hours_until_start = (start_time - now).total_seconds() / 3600.0
        is_last_minute = hours_until_start < 2.0

        # Host penalty rule: ₹100 penalty fee for last-minute host cancellation (<2 hours or post-start)
        penalty_fee = 100.0 if is_last_minute else 0.0

        # Create HostCancellationRecord
        cancel_record = HostCancellationRecord(
            host_profile_id=host_profile.id,
            booking_id=booking.id,
            reason=reason or "Host cancelled reservation",
            is_last_minute=is_last_minute,
            penalty_fee=penalty_fee
        )
        db.add(cancel_record)

        # Update Host Profile metrics & penalties
        host_profile.cancellation_count += 1
        host_profile.penalty_balance += penalty_fee
        drop = 15.0 if is_last_minute else 5.0
        host_profile.reliability_score = max(0.0, host_profile.reliability_score - drop)

        # Process Customer 100% Full Refund
        refund_amount = booking.total_amount if booking.status == BookingStatusEnum.CONFIRMED else 0.0

        payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
        if payment and payment.status == PaymentStatusEnum.PAID:
            payment.status = PaymentStatusEnum.REFUNDED
            refund_ref = f"REF-HOST-{uuid.uuid4().hex[:8].upper()}"
            refund = Refund(
                payment_id=payment.id,
                refund_reference=refund_ref,
                amount=refund_amount,
                reason=f"Host Cancellation: {reason or 'Host uncancelled space'}",
                status="PROCESSED"
            )
            db.add(refund)

            # Revert host gross earnings previously credited
            host_profile.total_earnings = max(0.0, host_profile.total_earnings - booking.parking_fee)

        # Create Customer Notification
        notification = Notification(
            user_id=booking.user_id,
            title="Reservation Cancelled by Host",
            message=f"Your booking #{booking.booking_reference} for {booking.listing.title} was cancelled by the host. A 100% full refund of ₹{refund_amount:.2f} has been processed.",
            notification_type="HOST_CANCELLED_BOOKING"
        )
        db.add(notification)

        booking.cancellation_tier = CancellationTierEnum.FULL_REFUND
        booking.refund_amount = refund_amount
        booking.cancelled_at = now
        booking.cancellation_reason = reason or "Cancelled by Host"
        booking.cancelled_by = "HOST"

        db.commit()
        db.refresh(booking)

        return BookingService.update_booking_status(
            db, booking, BookingStatusEnum.CANCELLED, reason=reason, cancelled_by="HOST"
        )

