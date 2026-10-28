"""Car Spa workshop service — Postgres-backed centers, services, bookings, payments."""
from __future__ import annotations

import hashlib
import hmac
import math
import random
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.account import Host, Admin
from app.models.booking import Notification
from app.models.car_spa import (
    CarSpaBooking,
    CarSpaBookingStatusEnum,
    CarSpaCenter,
    CarSpaPayment,
    CarSpaService as CarSpaServiceRow,
    CarSpaStatusEnum,
)
from app.models.user import User
from app.schemas.car_spa import (
    CarSpaAssignSlot,
    CarSpaBookingCreate,
    CarSpaBookingOut,
    CarSpaCenterCreate,
    CarSpaCenterOut,
    CarSpaCenterUpdate,
    CarSpaCustomerBrief,
    CarSpaServiceCreate,
    CarSpaServiceOut,
    CarSpaServiceUpdate,
)


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _round_money(x: float) -> float:
    return round(float(x) + 1e-9, 2)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _notify(db: Session, user_id: Optional[int], title: str, message: str, ntype: str, account_type: str = "customer") -> None:
    if not user_id:
        return
    db.add(Notification(
        user_id=user_id,
        account_type=account_type,
        title=title,
        message=message,
        notification_type=ntype,
    ))


def _gen_reference(db: Session) -> str:
    for _ in range(20):
        ref = f"SPA-{random.randint(100000, 999999)}"
        if not db.query(CarSpaBooking).filter(CarSpaBooking.booking_reference == ref).first():
            return ref
    return f"SPA-{int(_utc_now_naive().timestamp())}"


def _is_admin(account) -> bool:
    return isinstance(account, Admin) or any(
        getattr(r, "role", None) == "ADMIN" or getattr(getattr(r, "role", None), "value", None) == "ADMIN"
        for r in getattr(account, "roles", []) or []
    )


def _is_host(account) -> bool:
    return isinstance(account, Host)


def serialize_service(s: CarSpaServiceRow) -> CarSpaServiceOut:
    return CarSpaServiceOut(
        id=s.id,
        center_id=s.center_id,
        name=s.name,
        description=s.description,
        price=float(s.price),
        duration_minutes=s.duration_minutes or 45,
        is_active=bool(s.is_active),
    )


def serialize_center(
    c: CarSpaCenter,
    *,
    reveal_contact: bool = False,
    distance_km: Optional[float] = None,
    include_inactive_services: bool = False,
) -> CarSpaCenterOut:
    services = c.services or []
    if not include_inactive_services:
        services = [s for s in services if s.is_active]
    return CarSpaCenterOut(
        id=c.id,
        host_id=c.host_id,
        name=c.name,
        city=c.city,
        # Workshop address is public so customers can choose a spa; phone unlocks after payment.
        address=c.address,
        latitude=c.latitude,
        longitude=c.longitude,
        phone=c.phone if reveal_contact else None,
        description=c.description,
        photo_url=c.photo_url,
        operating_hours=c.operating_hours,
        status=c.status,
        rejection_reason=c.rejection_reason,
        approved_at=_aware(c.approved_at),
        distance_km=round(distance_km, 1) if distance_km is not None else None,
        services=[serialize_service(s) for s in services],
        contact_unlocked=reveal_contact,
        created_at=_aware(c.created_at),
        updated_at=_aware(c.updated_at),
    )


def serialize_booking(
    b: CarSpaBooking,
    *,
    viewer: str = "CUSTOMER",
    reveal_spa_contact: bool = False,
    include_customer: bool = False,
) -> CarSpaBookingOut:
    paid = bool(b.paid_at) or (b.amount_paid or 0) > 0
    show_spa = reveal_spa_contact or paid or viewer in ("HOST", "ADMIN")
    customer_brief = None
    if include_customer and b.customer is not None:
        customer_brief = CarSpaCustomerBrief(
            id=b.customer.id,
            full_name=b.customer.full_name or "Customer",
            phone_number=b.customer.phone_number if paid or viewer in ("HOST", "ADMIN") else None,
            email=b.customer.email if viewer in ("HOST", "ADMIN") else None,
        )
    return CarSpaBookingOut(
        id=b.id,
        booking_reference=b.booking_reference,
        center_id=b.center_id,
        service_id=b.service_id,
        customer_id=b.customer_id,
        service_name=b.service_name,
        service_price=float(b.service_price),
        spa_name=b.spa_name,
        spa_city=b.spa_city,
        spa_address=b.spa_address if show_spa else None,
        spa_phone=b.spa_phone if show_spa else None,
        wanted_date=b.wanted_date,
        customer_note=b.customer_note,
        slot_start=_aware(b.slot_start),
        slot_end=_aware(b.slot_end),
        status=b.status,
        amount_paid=float(b.amount_paid or 0),
        paid_at=_aware(b.paid_at),
        contact_unlocked=show_spa,
        customer=customer_brief,
        created_at=_aware(b.created_at),
        updated_at=_aware(b.updated_at),
    )


class CarSpaServiceApp:
    """Application service for car spa workshop flow."""

    # ----- centers -----------------------------------------------------------

    @staticmethod
    def get_center(db: Session, center_id: int) -> CarSpaCenter:
        c = (
            db.query(CarSpaCenter)
            .options(joinedload(CarSpaCenter.services))
            .filter(CarSpaCenter.id == center_id)
            .first()
        )
        if not c:
            raise HTTPException(status_code=404, detail="Car spa not found")
        return c

    @staticmethod
    def get_host_center(db: Session, host_id: int) -> Optional[CarSpaCenter]:
        return (
            db.query(CarSpaCenter)
            .options(joinedload(CarSpaCenter.services))
            .filter(CarSpaCenter.host_id == host_id)
            .first()
        )

    @staticmethod
    def list_public_centers(
        db: Session,
        city: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> List[CarSpaCenterOut]:
        q = (
            db.query(CarSpaCenter)
            .options(joinedload(CarSpaCenter.services))
            .filter(CarSpaCenter.status == CarSpaStatusEnum.ACTIVE.value)
        )
        if city and city.strip():
            q = q.filter(CarSpaCenter.city.ilike(f"%{city.strip()}%"))
        centers = q.all()
        out: List[Tuple[Optional[float], CarSpaCenterOut]] = []
        for c in centers:
            dist = None
            if lat is not None and lng is not None and c.latitude is not None and c.longitude is not None:
                dist = _haversine_km(lat, lng, c.latitude, c.longitude)
            out.append((dist, serialize_center(c, reveal_contact=False, distance_km=dist)))
        out.sort(key=lambda x: (x[0] is None, x[0] if x[0] is not None else 0, x[1].name.lower()))
        return [row[1] for row in out]

    @staticmethod
    def get_public_center(db: Session, center_id: int, customer: Optional[User] = None) -> CarSpaCenterOut:
        c = CarSpaServiceApp.get_center(db, center_id)
        if c.status != CarSpaStatusEnum.ACTIVE.value:
            raise HTTPException(status_code=404, detail="Car spa not found")
        reveal = False
        if customer is not None:
            paid = (
                db.query(CarSpaBooking)
                .filter(
                    CarSpaBooking.center_id == c.id,
                    CarSpaBooking.customer_id == customer.id,
                    CarSpaBooking.paid_at.isnot(None),
                )
                .first()
            )
            reveal = paid is not None
        return serialize_center(c, reveal_contact=reveal)

    @staticmethod
    def register_center(db: Session, host: Host, data: CarSpaCenterCreate) -> CarSpaCenterOut:
        existing = CarSpaServiceApp.get_host_center(db, host.id)
        if existing:
            raise HTTPException(status_code=409, detail="You already have a car spa registered. Edit it from your dashboard.")

        name = (data.name or "").strip()
        city = (data.city or "").strip()
        address = (data.address or "").strip()
        phone = (data.phone or "").strip()
        if len(name) < 2 or len(city) < 2 or len(address) < 5 or len(phone) < 8:
            raise HTTPException(status_code=400, detail="Name, city, address and phone are required")
        if not data.services:
            raise HTTPException(status_code=400, detail="Add at least one service with a price")

        center = CarSpaCenter(
            host_id=host.id,
            name=name,
            city=city,
            address=address,
            phone=phone,
            description=(data.description or "").strip() or None,
            photo_url=data.photo_url,
            operating_hours=data.operating_hours or "08:00 AM - 08:00 PM",
            latitude=data.latitude,
            longitude=data.longitude,
            status=CarSpaStatusEnum.PENDING_APPROVAL.value,
        )
        db.add(center)
        db.flush()
        for svc in data.services:
            db.add(CarSpaServiceRow(
                center_id=center.id,
                name=svc.name.strip(),
                description=(svc.description or "").strip() or None,
                price=_round_money(svc.price),
                duration_minutes=svc.duration_minutes or 45,
                is_active=True,
            ))
        db.commit()
        center = CarSpaServiceApp.get_center(db, center.id)
        return serialize_center(center, reveal_contact=True, include_inactive_services=True)

    @staticmethod
    def update_center(db: Session, host: Host, data: CarSpaCenterUpdate) -> CarSpaCenterOut:
        center = CarSpaServiceApp.get_host_center(db, host.id)
        if not center:
            raise HTTPException(status_code=404, detail="Register a car spa first")
        payload = data.model_dump(exclude_unset=True)
        for key, value in payload.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(center, key, value)
        # Material edits go back to pending if previously rejected/suspended? Keep ACTIVE edits live.
        if center.status == CarSpaStatusEnum.REJECTED.value:
            center.status = CarSpaStatusEnum.PENDING_APPROVAL.value
            center.rejection_reason = None
        db.commit()
        center = CarSpaServiceApp.get_center(db, center.id)
        return serialize_center(center, reveal_contact=True, include_inactive_services=True)

    @staticmethod
    def add_service(db: Session, host: Host, data: CarSpaServiceCreate) -> CarSpaServiceOut:
        center = CarSpaServiceApp.get_host_center(db, host.id)
        if not center:
            raise HTTPException(status_code=404, detail="Register a car spa first")
        svc = CarSpaServiceRow(
            center_id=center.id,
            name=data.name.strip(),
            description=(data.description or "").strip() or None,
            price=_round_money(data.price),
            duration_minutes=data.duration_minutes or 45,
            is_active=True,
        )
        db.add(svc)
        db.commit()
        db.refresh(svc)
        return serialize_service(svc)

    @staticmethod
    def update_service(db: Session, host: Host, service_id: int, data: CarSpaServiceUpdate) -> CarSpaServiceOut:
        center = CarSpaServiceApp.get_host_center(db, host.id)
        if not center:
            raise HTTPException(status_code=404, detail="Register a car spa first")
        svc = db.query(CarSpaServiceRow).filter(CarSpaServiceRow.id == service_id, CarSpaServiceRow.center_id == center.id).first()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        payload = data.model_dump(exclude_unset=True)
        for key, value in payload.items():
            if key == "price" and value is not None:
                value = _round_money(value)
            if isinstance(value, str):
                value = value.strip()
            setattr(svc, key, value)
        db.commit()
        db.refresh(svc)
        return serialize_service(svc)

    @staticmethod
    def delete_service(db: Session, host: Host, service_id: int) -> None:
        center = CarSpaServiceApp.get_host_center(db, host.id)
        if not center:
            raise HTTPException(status_code=404, detail="Register a car spa first")
        svc = db.query(CarSpaServiceRow).filter(CarSpaServiceRow.id == service_id, CarSpaServiceRow.center_id == center.id).first()
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        active_others = db.query(CarSpaServiceRow).filter(
            CarSpaServiceRow.center_id == center.id,
            CarSpaServiceRow.is_active.is_(True),
            CarSpaServiceRow.id != service_id,
        ).count()
        if active_others == 0 and svc.is_active:
            raise HTTPException(status_code=400, detail="Keep at least one active service")
        svc.is_active = False
        db.commit()

    # ----- admin -------------------------------------------------------------

    @staticmethod
    def list_admin_centers(db: Session, status: Optional[str] = None, city: Optional[str] = None) -> List[CarSpaCenterOut]:
        q = db.query(CarSpaCenter).options(joinedload(CarSpaCenter.services))
        if status and status != "ALL":
            q = q.filter(CarSpaCenter.status == status)
        if city and city.strip():
            q = q.filter(CarSpaCenter.city.ilike(f"%{city.strip()}%"))
        centers = q.order_by(CarSpaCenter.created_at.desc()).all()
        return [serialize_center(c, reveal_contact=True, include_inactive_services=True) for c in centers]

    @staticmethod
    def update_status(db: Session, center_id: int, status: str, reason: Optional[str] = None) -> CarSpaCenterOut:
        center = CarSpaServiceApp.get_center(db, center_id)
        status = (status or "").upper().strip()
        if status not in {s.value for s in CarSpaStatusEnum}:
            raise HTTPException(status_code=400, detail="Invalid status")
        center.status = status
        if status == CarSpaStatusEnum.ACTIVE.value:
            center.approved_at = _utc_now_naive()
            center.rejection_reason = None
            _notify(
                db, center.host_id,
                "Car spa approved",
                f"{center.name} is now live. Customers in {center.city} can book your services.",
                "CAR_SPA_APPROVED",
                "host",
            )
        elif status in (CarSpaStatusEnum.REJECTED.value, CarSpaStatusEnum.SUSPENDED.value):
            center.rejection_reason = (reason or "").strip() or None
            _notify(
                db, center.host_id,
                f"Car spa {status.replace('_', ' ').title()}",
                reason or f"Your car spa {center.name} was marked {status}.",
                "CAR_SPA_STATUS",
                "host",
            )
        db.commit()
        center = CarSpaServiceApp.get_center(db, center_id)
        return serialize_center(center, reveal_contact=True, include_inactive_services=True)

    # ----- bookings ----------------------------------------------------------

    @staticmethod
    def create_booking(db: Session, customer: User, data: CarSpaBookingCreate) -> CarSpaBookingOut:
        center = CarSpaServiceApp.get_center(db, data.center_id)
        if center.status != CarSpaStatusEnum.ACTIVE.value:
            raise HTTPException(status_code=400, detail="This car spa is not accepting bookings yet")
        svc = (
            db.query(CarSpaServiceRow)
            .filter(
                CarSpaServiceRow.id == data.service_id,
                CarSpaServiceRow.center_id == center.id,
                CarSpaServiceRow.is_active.is_(True),
            )
            .first()
        )
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found for this spa")

        today = date.today()
        if data.wanted_date < today:
            raise HTTPException(status_code=400, detail="Wanted date cannot be in the past")

        booking = CarSpaBooking(
            booking_reference=_gen_reference(db),
            center_id=center.id,
            service_id=svc.id,
            customer_id=customer.id,
            service_name=svc.name,
            service_price=_round_money(svc.price),
            spa_name=center.name,
            spa_city=center.city,
            spa_address=center.address,
            spa_phone=center.phone,
            wanted_date=data.wanted_date,
            customer_note=(data.customer_note or "").strip() or None,
            status=CarSpaBookingStatusEnum.AWAITING_PAYMENT.value,
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return serialize_booking(booking, viewer="CUSTOMER", reveal_spa_contact=False)

    @staticmethod
    def get_booking(db: Session, booking_id: int) -> CarSpaBooking:
        b = (
            db.query(CarSpaBooking)
            .options(
                joinedload(CarSpaBooking.customer),
                joinedload(CarSpaBooking.center),
            )
            .filter(CarSpaBooking.id == booking_id)
            .first()
        )
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        return b

    @staticmethod
    def list_customer_bookings(db: Session, customer: User) -> List[CarSpaBookingOut]:
        rows = (
            db.query(CarSpaBooking)
            .options(joinedload(CarSpaBooking.customer))
            .filter(CarSpaBooking.customer_id == customer.id)
            .order_by(CarSpaBooking.created_at.desc())
            .all()
        )
        return [serialize_booking(b, viewer="CUSTOMER") for b in rows]

    @staticmethod
    def list_incoming_bookings(db: Session, host: Host) -> List[CarSpaBookingOut]:
        center = CarSpaServiceApp.get_host_center(db, host.id)
        if not center:
            return []
        rows = (
            db.query(CarSpaBooking)
            .options(joinedload(CarSpaBooking.customer))
            .filter(
                CarSpaBooking.center_id == center.id,
                CarSpaBooking.status.in_([
                    CarSpaBookingStatusEnum.PAID_AWAITING_SLOT.value,
                    CarSpaBookingStatusEnum.SLOT_ASSIGNED.value,
                    CarSpaBookingStatusEnum.COMPLETED.value,
                    CarSpaBookingStatusEnum.CANCELLED.value,
                ]),
            )
            .order_by(CarSpaBooking.created_at.desc())
            .all()
        )
        return [serialize_booking(b, viewer="HOST", include_customer=True) for b in rows]

    @staticmethod
    def list_admin_bookings(db: Session) -> List[CarSpaBookingOut]:
        rows = (
            db.query(CarSpaBooking)
            .options(joinedload(CarSpaBooking.customer))
            .order_by(CarSpaBooking.created_at.desc())
            .all()
        )
        return [serialize_booking(b, viewer="ADMIN", include_customer=True) for b in rows]

    @staticmethod
    def assign_slot(db: Session, host: Host, booking_id: int, data: CarSpaAssignSlot) -> CarSpaBookingOut:
        center = CarSpaServiceApp.get_host_center(db, host.id)
        if not center:
            raise HTTPException(status_code=404, detail="Register a car spa first")
        b = CarSpaServiceApp.get_booking(db, booking_id)
        if b.center_id != center.id:
            raise HTTPException(status_code=403, detail="Not your booking")
        if b.status not in (
            CarSpaBookingStatusEnum.PAID_AWAITING_SLOT.value,
            CarSpaBookingStatusEnum.SLOT_ASSIGNED.value,
        ):
            raise HTTPException(status_code=400, detail="Slot can only be set after the customer has paid")

        start = data.slot_start
        if start.tzinfo is not None:
            start = start.astimezone(timezone.utc).replace(tzinfo=None)
        end = data.slot_end
        if end is None:
            minutes = 45
            if b.service_id:
                svc = db.query(CarSpaServiceRow).filter(CarSpaServiceRow.id == b.service_id).first()
                if svc and svc.duration_minutes:
                    minutes = svc.duration_minutes
            end = start + timedelta(minutes=minutes)
        elif end.tzinfo is not None:
            end = end.astimezone(timezone.utc).replace(tzinfo=None)
        if end <= start:
            raise HTTPException(status_code=400, detail="Slot end must be after start")

        b.slot_start = start
        b.slot_end = end
        b.status = CarSpaBookingStatusEnum.SLOT_ASSIGNED.value
        try:
            from zoneinfo import ZoneInfo
            slot_label = (
                start.replace(tzinfo=timezone.utc)
                .astimezone(ZoneInfo("Asia/Kolkata"))
                .strftime("%d %b %Y, %I:%M %p")
            ) + " IST"
        except Exception:
            slot_label = start.strftime("%d %b %Y, %I:%M %p") + " UTC"
        _notify(
            db, b.customer_id,
            "Your car spa slot is confirmed",
            f"{b.spa_name} scheduled {b.service_name} for {slot_label}. Bring your car to {b.spa_address}.",
            "CAR_SPA_SLOT_ASSIGNED",
            "customer",
        )
        db.commit()
        b = CarSpaServiceApp.get_booking(db, booking_id)
        return serialize_booking(b, viewer="HOST", include_customer=True)

    @staticmethod
    def cancel_by_customer(db: Session, customer: User, booking_id: int) -> CarSpaBookingOut:
        b = CarSpaServiceApp.get_booking(db, booking_id)
        if b.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not your booking")
        if b.status in (CarSpaBookingStatusEnum.COMPLETED.value, CarSpaBookingStatusEnum.CANCELLED.value):
            raise HTTPException(status_code=400, detail="Booking cannot be cancelled")
        b.status = CarSpaBookingStatusEnum.CANCELLED.value
        if b.center:
            _notify(
                db, b.center.host_id,
                "Car spa booking cancelled",
                f"{b.booking_reference} for {b.service_name} was cancelled by the customer.",
                "CAR_SPA_CANCELLED",
                "host",
            )
        db.commit()
        return serialize_booking(b, viewer="CUSTOMER")

    # ----- payments ----------------------------------------------------------

    @staticmethod
    def create_payment_order(db: Session, customer: User, booking_id: int) -> dict:
        b = CarSpaServiceApp.get_booking(db, booking_id)
        if b.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not your booking")
        if b.status != CarSpaBookingStatusEnum.AWAITING_PAYMENT.value:
            raise HTTPException(status_code=400, detail=f"No payment is due while the booking is {b.status}")

        amount = _round_money(b.service_price)
        if amount < 1.0:
            raise HTTPException(status_code=400, detail="Nothing to pay")

        amount_in_paise = max(100, int(round(amount * 100)))
        order_id = f"order_spa_{random.randint(1000000, 9999999)}"

        if not settings.RAZORPAY_MOCK_MODE:
            try:
                import httpx
                res = httpx.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                    json={
                        "amount": amount_in_paise,
                        "currency": "INR",
                        "receipt": f"spa_{b.id}_{random.randint(1000, 9999)}",
                        "notes": {
                            "car_spa_booking_id": str(b.id),
                            "booking_reference": b.booking_reference,
                            "user_id": str(customer.id),
                        },
                    },
                    timeout=10.0,
                )
                if res.status_code in (200, 201):
                    order_id = res.json().get("id", order_id)
                else:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Razorpay order failed ({res.status_code})",
                    )
            except HTTPException:
                raise
            except Exception as e:
                print(f"[car-spa] Razorpay order exception: {e}")
                raise HTTPException(status_code=502, detail="Could not create payment order")

        pending = db.query(CarSpaPayment).filter(
            CarSpaPayment.booking_id == b.id,
            CarSpaPayment.status == "PENDING",
        ).first()
        if pending:
            pending.order_id = order_id
            pending.amount = amount
            payment = pending
        else:
            payment = CarSpaPayment(
                booking_id=b.id,
                order_id=order_id,
                provider="MOCK" if settings.RAZORPAY_MOCK_MODE else "RAZORPAY",
                amount=amount,
                currency="INR",
                status="PENDING",
            )
            db.add(payment)
        db.commit()
        db.refresh(payment)

        return {
            "payment_id": payment.id,
            "booking_id": b.id,
            "booking_reference": b.booking_reference,
            "order_id": order_id,
            "amount": amount,
            "amount_in_paise": amount_in_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "mock_mode": settings.RAZORPAY_MOCK_MODE,
            "description": f"Car spa – {b.service_name} ({b.booking_reference})",
        }

    @staticmethod
    def verify_payment(
        db: Session,
        customer: User,
        booking_id: int,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> CarSpaBookingOut:
        b = CarSpaServiceApp.get_booking(db, booking_id)
        if b.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not your booking")

        payment = db.query(CarSpaPayment).filter(
            CarSpaPayment.booking_id == b.id,
            CarSpaPayment.order_id == order_id,
        ).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment order not found for this booking")
        if payment.status == "PAID":
            return serialize_booking(b, viewer="CUSTOMER", reveal_spa_contact=True)

        verified = False
        if settings.RAZORPAY_MOCK_MODE:
            verified = True
        else:
            expected = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
                f"{order_id}|{payment_id}".encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            if signature and hmac.compare_digest(expected, signature):
                verified = True
            else:
                try:
                    import httpx
                    r = httpx.get(
                        f"https://api.razorpay.com/v1/payments/{payment_id}",
                        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                        timeout=5.0,
                    )
                    if r.status_code == 200:
                        data = r.json()
                        if data.get("status") in ("captured", "authorized") and data.get("order_id") == order_id:
                            verified = True
                except Exception:
                    pass

        if not verified:
            payment.status = "FAILED"
            db.commit()
            raise HTTPException(status_code=400, detail="Payment verification failed")

        payment.payment_id = payment_id
        payment.signature = signature
        payment.status = "PAID"
        now = _utc_now_naive()
        b.amount_paid = _round_money(payment.amount)
        b.paid_at = now
        b.status = CarSpaBookingStatusEnum.PAID_AWAITING_SLOT.value

        if b.center:
            cust_name = customer.full_name or "Customer"
            cust_phone = customer.phone_number or "—"
            _notify(
                db, b.center.host_id,
                "New paid car spa booking",
                f"{cust_name} ({cust_phone}) booked {b.service_name} for {b.wanted_date.isoformat()}. Assign a slot.",
                "CAR_SPA_NEW_BOOKING",
                "host",
            )
        _notify(
            db, customer.id,
            "Payment received",
            f"Your {b.service_name} booking at {b.spa_name} is confirmed. Spa contact is unlocked. Slot timing will follow.",
            "CAR_SPA_PAID",
            "customer",
        )
        db.commit()
        b = CarSpaServiceApp.get_booking(db, booking_id)
        return serialize_booking(b, viewer="CUSTOMER", reveal_spa_contact=True)

    # ----- stats (admin dashboard) -------------------------------------------

    @staticmethod
    def get_total_revenue(db: Session) -> float:
        rows = db.query(CarSpaBooking).filter(CarSpaBooking.paid_at.isnot(None)).all()
        return float(sum(b.amount_paid or 0 for b in rows))

    @staticmethod
    def get_total_bookings(db: Session) -> int:
        return db.query(CarSpaBooking).filter(CarSpaBooking.paid_at.isnot(None)).count()

    @staticmethod
    def count_centers(db: Session, status: Optional[str] = None) -> int:
        q = db.query(CarSpaCenter)
        if status:
            q = q.filter(CarSpaCenter.status == status)
        return q.count()


# Backward-compatible name used by admin router today
class CarSpaService:
    """Facade matching the old static API surface, now DB-backed."""

    @staticmethod
    def get_packages():
        return []

    @staticmethod
    def get_all_spas(status: Optional[str] = None, city: Optional[str] = None, db: Session = None):
        if db is None:
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                return CarSpaServiceApp.list_admin_centers(db, status=status, city=city)
            finally:
                db.close()
        return CarSpaServiceApp.list_admin_centers(db, status=status, city=city)

    @staticmethod
    def get_total_revenue(db: Session = None) -> float:
        if db is None:
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                return CarSpaServiceApp.get_total_revenue(db)
            finally:
                db.close()
        return CarSpaServiceApp.get_total_revenue(db)

    @staticmethod
    def get_total_bookings(db: Session = None) -> int:
        if db is None:
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                return CarSpaServiceApp.get_total_bookings(db)
            finally:
                db.close()
        return CarSpaServiceApp.get_total_bookings(db)

    @staticmethod
    def get_all_bookings(db: Session = None):
        if db is None:
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                return CarSpaServiceApp.list_admin_bookings(db)
            finally:
                db.close()
        return CarSpaServiceApp.list_admin_bookings(db)
