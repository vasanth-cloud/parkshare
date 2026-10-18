"""
Acting Driver workflow service.

Lifecycle of a chauffeur booking
--------------------------------
  REQUESTED        customer posts a trip request; broadcast to ACTIVE + online drivers in the pickup city
  DRIVER_ACCEPTED  a driver accepted → customer is notified and must pay the estimated fare
  CONFIRMED        advance paid → driver contact details revealed, 4-digit START OTP issued to the customer
  TRIP_STARTED     driver arrived & entered the START OTP → END OTP issued to the customer, meter running
  PAYMENT_DUE      driver entered the END OTP, trip ran longer than booked → overtime balance to settle
  COMPLETED        fully settled (either no overtime, or balance paid) → driver earnings credited
  CANCELLED / EXPIRED

All money logic (hourly rate, car-type multiplier, night surcharge, platform fee, tax) is driven by the
single admin-controlled ``ActingDriverPricingConfig`` row. Drivers can never set their own price.
"""
import hmac
import math
import hashlib
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import is_sqlite
from app.models.user import User, UserRoleEnum
from app.models.booking import Notification
from app.models.driver import (
    ActingDriverProfile,
    ActingDriverPricingConfig,
    ActingDriverBooking,
    ActingDriverPayment,
    DriverStatusEnum,
    DriverBookingStatusEnum,
    DriverPaymentPurposeEnum,
)
from app.schemas.driver import (
    DriverRegistrationCreate,
    DriverProfileOut,
    DriverPublicOut,
    DriverContactOut,
    DriverEarningsOut,
    DriverPricingOut,
    DriverPricingUpdate,
    FareBreakdownOut,
    DriverBookingCreate,
    DriverBookingOut,
    CustomerBriefOut,
    DriverAdminSummaryOut,
)
from app.services.kyc_service import AutomatedKYCProvider

DEFAULT_CAR_MULTIPLIERS = {
    "HATCHBACK": 1.0,
    "SEDAN": 1.1,
    "SUV": 1.25,
    "LUXURY": 1.5,
    "VAN": 1.2,
}

ALLOWED_CAR_TYPES = list(DEFAULT_CAR_MULTIPLIERS.keys())
ALLOWED_TRANSMISSIONS = ["MANUAL", "AUTOMATIC"]

# Statuses in which the customer may see the driver's contact details
CONTACT_VISIBLE_STATUSES = {
    DriverBookingStatusEnum.CONFIRMED.value,
    DriverBookingStatusEnum.TRIP_STARTED.value,
    DriverBookingStatusEnum.PAYMENT_DUE.value,
    DriverBookingStatusEnum.COMPLETED.value,
}

# Statuses that occupy a driver (used for overlap checks)
DRIVER_BUSY_STATUSES = {
    DriverBookingStatusEnum.DRIVER_ACCEPTED.value,
    DriverBookingStatusEnum.CONFIRMED.value,
    DriverBookingStatusEnum.TRIP_STARTED.value,
}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """DB stores naive UTC – attach tzinfo so API responses carry an explicit offset."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _gen_otp() -> str:
    return f"{random.randint(1000, 9999)}"


def _gen_reference(db: Session) -> str:
    for _ in range(10):
        ref = f"ADR-{random.randint(100000, 999999)}"
        if not db.query(ActingDriverBooking.id).filter(ActingDriverBooking.booking_reference == ref).first():
            return ref
    return f"ADR-{random.randint(1000000, 9999999)}"


def _mask(value: Optional[str], keep: int = 4) -> str:
    if not value:
        return ""
    clean = str(value).replace(" ", "")
    if len(clean) <= keep:
        return clean
    return "X" * (len(clean) - keep) + clean[-keep:]


def _display_name(full_name: str) -> str:
    parts = [p for p in (full_name or "").strip().split() if p]
    if not parts:
        return "Driver"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[1][0]}."


def _badge(profile: ActingDriverProfile) -> str:
    if profile.total_trips >= 50 and profile.rating >= 4.8:
        return "Elite Chauffeur"
    if profile.total_trips >= 20 and profile.rating >= 4.5:
        return "Top Rated"
    if profile.experience_years >= 10:
        return "Veteran Driver"
    if profile.total_trips == 0:
        return "New Partner"
    return "Verified Chauffeur"


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


def _round_money(x: float) -> float:
    return round(float(x) + 1e-9, 2)


def _is_admin(user: User) -> bool:
    return any(r.role == UserRoleEnum.ADMIN for r in user.roles)


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class DriverPricing:
    @staticmethod
    def get(db: Session) -> ActingDriverPricingConfig:
        cfg = db.query(ActingDriverPricingConfig).order_by(ActingDriverPricingConfig.id.asc()).first()
        if not cfg:
            cfg = ActingDriverPricingConfig(
                hourly_rate=149.0,
                platform_fee_percent=settings.PLATFORM_COMMISSION_PERCENTAGE,
                tax_percent=settings.TAX_PERCENTAGE,
                min_billable_hours=2.0,
                night_surcharge_percent=20.0,
                night_start_hour=22,
                night_end_hour=6,
                outstation_hourly_rate=129.0,
                outstation_min_hours=10.0,
                car_type_multipliers=dict(DEFAULT_CAR_MULTIPLIERS),
                billing_increment_minutes=30,
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        if not cfg.car_type_multipliers:
            cfg.car_type_multipliers = dict(DEFAULT_CAR_MULTIPLIERS)
            db.commit()
        return cfg

    @staticmethod
    def to_out(cfg: ActingDriverPricingConfig) -> DriverPricingOut:
        return DriverPricingOut(
            hourly_rate=cfg.hourly_rate,
            platform_fee_percent=cfg.platform_fee_percent,
            tax_percent=cfg.tax_percent,
            min_billable_hours=cfg.min_billable_hours,
            night_surcharge_percent=cfg.night_surcharge_percent,
            night_start_hour=cfg.night_start_hour,
            night_end_hour=cfg.night_end_hour,
            outstation_hourly_rate=cfg.outstation_hourly_rate,
            outstation_min_hours=cfg.outstation_min_hours,
            car_type_multipliers=dict(cfg.car_type_multipliers or DEFAULT_CAR_MULTIPLIERS),
            billing_increment_minutes=cfg.billing_increment_minutes,
            updated_at=_aware(cfg.updated_at),
        )

    @staticmethod
    def update(db: Session, admin: User, data: DriverPricingUpdate) -> DriverPricingOut:
        cfg = DriverPricing.get(db)
        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        if "car_type_multipliers" in payload:
            merged = dict(cfg.car_type_multipliers or DEFAULT_CAR_MULTIPLIERS)
            for k, v in payload["car_type_multipliers"].items():
                key = str(k).upper().strip()
                if key not in ALLOWED_CAR_TYPES:
                    raise HTTPException(status_code=400, detail=f"Unknown car type '{k}'. Allowed: {', '.join(ALLOWED_CAR_TYPES)}")
                if float(v) <= 0:
                    raise HTTPException(status_code=400, detail="Car-type multipliers must be positive")
                merged[key] = float(v)
            payload["car_type_multipliers"] = merged
        for k, v in payload.items():
            setattr(cfg, k, v)
        cfg.updated_by_user_id = admin.id
        cfg.updated_at = _utc_now_naive()
        db.commit()
        db.refresh(cfg)
        return DriverPricing.to_out(cfg)


def _night_hours_between(start: datetime, end: datetime, night_start: int, night_end: int) -> float:
    """Count the hours of [start, end) that fall inside the nightly window (IST wall-clock)."""
    if end <= start:
        return 0.0
    ist = timezone(timedelta(hours=5, minutes=30))
    s = start.replace(tzinfo=timezone.utc).astimezone(ist)
    e = end.replace(tzinfo=timezone.utc).astimezone(ist)
    total = 0.0
    cursor = s
    step = timedelta(minutes=15)
    # Sample in 15-minute slices (bookings are at most a few days long)
    max_iter = 4 * 24 * 10
    i = 0
    while cursor < e and i < max_iter:
        nxt = min(cursor + step, e)
        h = cursor.hour
        in_night = (h >= night_start or h < night_end) if night_start > night_end else (night_start <= h < night_end)
        if in_night:
            total += (nxt - cursor).total_seconds() / 3600.0
        cursor = nxt
        i += 1
    return round(total, 2)


def compute_fare(
    cfg: ActingDriverPricingConfig,
    start: datetime,
    end: datetime,
    car_type: str,
    *,
    hourly_rate_override: Optional[float] = None,
    car_multiplier_override: Optional[float] = None,
    platform_fee_override: Optional[float] = None,
    tax_override: Optional[float] = None,
    min_billable_override: Optional[float] = None,
) -> FareBreakdownOut:
    start = _to_naive_utc(start)
    end = _to_naive_utc(end)
    if end <= start:
        raise HTTPException(status_code=400, detail="Trip end time must be after the start time")

    raw_hours = (end - start).total_seconds() / 3600.0
    increment_h = max(1, cfg.billing_increment_minutes or 30) / 60.0
    rounded_hours = math.ceil(raw_hours / increment_h - 1e-9) * increment_h
    min_billable = min_billable_override if min_billable_override is not None else (cfg.min_billable_hours or 1.0)
    billable_hours = max(rounded_hours, min_billable)

    car_key = (car_type or "SEDAN").upper().strip()
    if car_key not in ALLOWED_CAR_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported car type '{car_type}'. Allowed: {', '.join(ALLOWED_CAR_TYPES)}")
    multipliers = cfg.car_type_multipliers or DEFAULT_CAR_MULTIPLIERS
    car_multiplier = car_multiplier_override if car_multiplier_override is not None else float(multipliers.get(car_key, 1.0))

    trip_type = "OUTSTATION" if billable_hours >= (cfg.outstation_min_hours or 10.0) else "CITY"
    if hourly_rate_override is not None:
        hourly_rate = hourly_rate_override
    else:
        hourly_rate = cfg.outstation_hourly_rate if trip_type == "OUTSTATION" else cfg.hourly_rate

    effective_rate = _round_money(hourly_rate * car_multiplier)
    base_fee = billable_hours * effective_rate

    night_hours = _night_hours_between(start, end, cfg.night_start_hour or 22, cfg.night_end_hour or 6)
    night_surcharge = _round_money(night_hours * effective_rate * (cfg.night_surcharge_percent or 0.0) / 100.0)

    driver_fee = _round_money(base_fee + night_surcharge)
    platform_pct = platform_fee_override if platform_fee_override is not None else cfg.platform_fee_percent
    tax_pct = tax_override if tax_override is not None else cfg.tax_percent
    platform_fee = _round_money(driver_fee * platform_pct / 100.0)
    tax = _round_money((driver_fee + platform_fee) * tax_pct / 100.0)
    total = _round_money(driver_fee + platform_fee + tax)

    return FareBreakdownOut(
        hours=round(raw_hours, 2),
        billable_hours=round(billable_hours, 2),
        hourly_rate=hourly_rate,
        car_type=car_key,
        car_multiplier=car_multiplier,
        effective_hourly_rate=effective_rate,
        night_hours=night_hours,
        night_surcharge=night_surcharge,
        trip_type=trip_type,
        driver_fee=driver_fee,
        platform_fee_percent=platform_pct,
        platform_fee=platform_fee,
        tax_percent=tax_pct,
        tax=tax,
        total=total,
    )


# ---------------------------------------------------------------------------
# Serialisers
# ---------------------------------------------------------------------------

def serialize_driver_full(p: ActingDriverProfile) -> DriverProfileOut:
    return DriverProfileOut(
        id=p.id,
        user_id=p.user_id,
        full_name=p.full_name,
        phone=p.phone,
        email=p.user.email if p.user else None,
        photo_url=p.photo_url,
        city=p.city,
        service_area=p.service_area,
        latitude=p.latitude,
        longitude=p.longitude,
        service_radius_km=p.service_radius_km or 15.0,
        dl_number=p.dl_number,
        dl_expiry_date=p.dl_expiry_date,
        dl_document_url=p.dl_document_url,
        dl_verified=bool(p.dl_verified),
        aadhaar_number_masked=_mask(p.aadhaar_number),
        aadhaar_document_url=p.aadhaar_document_url,
        aadhaar_verified=bool(p.aadhaar_verified),
        kyc_provider=p.kyc_provider,
        kyc_verified_at=_aware(p.kyc_verified_at),
        experience_years=p.experience_years or 0,
        transmissions=list(p.transmissions or []),
        vehicle_categories=list(p.vehicle_categories or []),
        languages=list(p.languages or []),
        trip_types=list(p.trip_types or []),
        status=p.status,
        rejection_reason=p.rejection_reason,
        is_available=bool(p.is_available),
        approved_at=_aware(p.approved_at),
        rating=round(float(p.rating or 5.0), 1),
        rating_count=p.rating_count or 0,
        total_trips=p.total_trips or 0,
        total_earnings=_round_money(p.total_earnings or 0.0),
        created_at=_aware(p.created_at),
    )


def serialize_driver_public(p: ActingDriverProfile) -> DriverPublicOut:
    return DriverPublicOut(
        id=p.id,
        display_name=_display_name(p.full_name),
        photo_url=p.photo_url,
        city=p.city,
        experience_years=p.experience_years or 0,
        transmissions=list(p.transmissions or []),
        vehicle_categories=list(p.vehicle_categories or []),
        languages=list(p.languages or []),
        rating=round(float(p.rating or 5.0), 1),
        rating_count=p.rating_count or 0,
        total_trips=p.total_trips or 0,
        badge=_badge(p),
    )


def serialize_driver_contact(p: ActingDriverProfile) -> DriverContactOut:
    pub = serialize_driver_public(p)
    return DriverContactOut(
        **pub.model_dump(),
        full_name=p.full_name,
        phone=p.phone,
        dl_number_masked=_mask(p.dl_number, 4),
    )


def serialize_booking(b: ActingDriverBooking, viewer: str, cfg: Optional[ActingDriverPricingConfig] = None) -> DriverBookingOut:
    """viewer ∈ {"CUSTOMER", "DRIVER", "ADMIN"}"""
    show_otps = viewer in ("CUSTOMER", "ADMIN")
    contact_visible = b.status in CONTACT_VISIBLE_STATUSES

    driver_pub = serialize_driver_public(b.driver) if b.driver else None
    driver_contact = None
    if b.driver and (viewer == "ADMIN" or (viewer == "CUSTOMER" and contact_visible) or viewer == "DRIVER"):
        driver_contact = serialize_driver_contact(b.driver)

    customer_brief = None
    if b.customer and viewer in ("DRIVER", "ADMIN"):
        reveal_phone = viewer == "ADMIN" or contact_visible
        customer_brief = CustomerBriefOut(
            id=b.customer.id,
            full_name=b.customer.full_name,
            phone_number=b.customer.phone_number if reveal_phone else None,
        )

    live_elapsed = None
    live_total = None
    if b.status == DriverBookingStatusEnum.TRIP_STARTED.value and b.trip_started_at:
        now = _utc_now_naive()
        live_elapsed = round(max(0.0, (now - b.trip_started_at).total_seconds() / 60.0), 1)
        if cfg is not None:
            try:
                fb = _settlement_fare(b, cfg, b.trip_started_at, max(now, b.trip_started_at + timedelta(minutes=1)))
                live_total = fb.total
            except HTTPException:
                live_total = None

    return DriverBookingOut(
        id=b.id,
        booking_reference=b.booking_reference,
        customer_id=b.customer_id,
        driver_id=b.driver_id,
        status=b.status,
        pickup_address=b.pickup_address,
        pickup_city=b.pickup_city,
        pickup_latitude=b.pickup_latitude,
        pickup_longitude=b.pickup_longitude,
        drop_address=b.drop_address,
        start_time=_aware(b.start_time),
        end_time=_aware(b.end_time),
        trip_type=b.trip_type or "CITY",
        car_type=b.car_type,
        transmission=b.transmission,
        seater=b.seater or 5,
        car_make_model=b.car_make_model,
        car_registration=b.car_registration,
        notes=b.notes,
        hourly_rate=b.hourly_rate,
        car_multiplier=b.car_multiplier or 1.0,
        platform_fee_percent=b.platform_fee_percent,
        tax_percent=b.tax_percent,
        estimated_hours=b.estimated_hours,
        estimated_driver_fee=b.estimated_driver_fee,
        estimated_platform_fee=b.estimated_platform_fee,
        estimated_tax=b.estimated_tax,
        estimated_total=b.estimated_total,
        accepted_at=_aware(b.accepted_at),
        paid_at=_aware(b.paid_at),
        trip_started_at=_aware(b.trip_started_at),
        trip_ended_at=_aware(b.trip_ended_at),
        start_otp=b.start_otp if show_otps else None,
        end_otp=b.end_otp if show_otps else None,
        actual_hours=b.actual_hours,
        billable_hours=b.billable_hours,
        overtime_hours=b.overtime_hours or 0.0,
        final_driver_fee=b.final_driver_fee,
        final_platform_fee=b.final_platform_fee,
        final_tax=b.final_tax,
        final_total=b.final_total,
        amount_paid=b.amount_paid or 0.0,
        balance_due=b.balance_due or 0.0,
        driver_earning=b.driver_earning or 0.0,
        cancellation_reason=b.cancellation_reason,
        cancelled_by=b.cancelled_by,
        cancelled_at=_aware(b.cancelled_at),
        refund_amount=b.refund_amount or 0.0,
        customer_rating=b.customer_rating,
        customer_review=b.customer_review,
        driver=driver_pub,
        driver_contact=driver_contact,
        customer=customer_brief,
        live_elapsed_minutes=live_elapsed,
        live_running_total=live_total,
        created_at=_aware(b.created_at),
        updated_at=_aware(b.updated_at),
    )


def _settlement_fare(b: ActingDriverBooking, cfg: ActingDriverPricingConfig, start: datetime, end: datetime) -> FareBreakdownOut:
    """
    Fare for an actual window using the pricing snapshot captured at booking time.
    The booked estimate is the minimum charge: a trip that ends early (or has fewer night hours
    than planned) is billed at the estimate; only genuine overtime increases the total.
    """
    fb = compute_fare(
        cfg,
        start,
        end,
        b.car_type,
        hourly_rate_override=b.hourly_rate,
        car_multiplier_override=b.car_multiplier or 1.0,
        platform_fee_override=b.platform_fee_percent,
        tax_override=b.tax_percent,
        min_billable_override=b.estimated_hours,
    )
    if fb.total < (b.estimated_total or 0.0):
        fb.billable_hours = max(fb.billable_hours, b.estimated_hours or 0.0)
        fb.driver_fee = b.estimated_driver_fee
        fb.platform_fee = b.estimated_platform_fee
        fb.tax = b.estimated_tax
        fb.total = b.estimated_total
    return fb


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class DriverService:

    # ----- driver profile ---------------------------------------------------

    @staticmethod
    def get_profile_by_user(db: Session, user_id: int) -> Optional[ActingDriverProfile]:
        return db.query(ActingDriverProfile).filter(ActingDriverProfile.user_id == user_id).first()

    @staticmethod
    def require_profile(db: Session, user: User) -> ActingDriverProfile:
        p = DriverService.get_profile_by_user(db, user.id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have not registered as an acting driver yet")
        return p

    @staticmethod
    def register_driver(db: Session, user: User, data: DriverRegistrationCreate) -> ActingDriverProfile:
        if DriverService.get_profile_by_user(db, user.id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already registered as an acting driver")

        full_name = data.full_name.strip()
        phone = data.phone.strip()
        dl_number = data.dl_number.strip().replace(" ", "").replace("-", "").upper()

        # Aadhaar is collected at partner sign-up. Reuse that KYC when the form does not send it again.
        aadhaar = (data.aadhaar_number or "").strip().replace(" ", "").replace("-", "")
        aadhaar_doc = data.aadhaar_document_url
        aadhaar_verified = False
        aadhaar_ref = None
        host_profile = user.host_profile
        if not aadhaar and host_profile and (host_profile.gov_id_type or "").upper() == "AADHAAR":
            aadhaar = (host_profile.gov_id_number or "").replace(" ", "").replace("-", "")
            aadhaar_doc = aadhaar_doc or host_profile.gov_id_document_url
            aadhaar_verified = bool(host_profile.is_identity_verified and aadhaar)

        # Duplicate checks across all driver partners
        dup_filters = [ActingDriverProfile.dl_number == dl_number]
        if aadhaar:
            dup_filters.append(ActingDriverProfile.aadhaar_number == aadhaar)
        dup = db.query(ActingDriverProfile).filter(or_(*dup_filters)).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This Driving Licence is already registered with another driver partner")

        # Automated KYC – same engine used for host identity verification
        dl_ok, dl_res = AutomatedKYCProvider.verify_document(
            gov_id_type="DRIVING_LICENCE",
            gov_id_number=dl_number,
            legal_name=full_name,
            document_url=data.dl_document_url,
            profile_photo_url=data.photo_url or "",
        )
        if not dl_ok:
            raise HTTPException(status_code=400, detail=f"Driving Licence verification failed: {dl_res.get('error', 'invalid DL')}")

        # Only re-check Aadhaar when a fresh number is submitted with the driver application
        if data.aadhaar_number and aadhaar:
            ad_ok, ad_res = AutomatedKYCProvider.verify_document(
                gov_id_type="AADHAAR",
                gov_id_number=aadhaar,
                legal_name=full_name,
                document_url=data.aadhaar_document_url or aadhaar_doc or "",
                profile_photo_url=data.photo_url or "",
            )
            if not ad_ok:
                raise HTTPException(status_code=400, detail=f"Aadhaar verification failed: {ad_res.get('error', 'invalid Aadhaar')}")
            aadhaar_verified = True
            aadhaar_ref = ad_res.get("transaction_ref")

        if data.dl_expiry_date:
            try:
                exp = datetime.strptime(data.dl_expiry_date[:10], "%Y-%m-%d").date()
                if exp < datetime.now(timezone.utc).date():
                    raise HTTPException(status_code=400, detail="Your Driving Licence has expired. Please renew it before registering.")
            except ValueError:
                raise HTTPException(status_code=400, detail="DL expiry date must be in YYYY-MM-DD format")

        transmissions = [t.strip() for t in (data.transmissions or []) if t and t.strip()] or ["Manual", "Automatic"]
        categories = [c.strip().upper() for c in (data.vehicle_categories or []) if c and c.strip()]
        categories = [c for c in categories if c in ALLOWED_CAR_TYPES] or ["HATCHBACK", "SEDAN"]
        languages = [l.strip() for l in (data.languages or []) if l and l.strip()] or ["English"]
        trip_types = [t.strip().upper() for t in (data.trip_types or []) if t and t.strip()] or ["CITY"]

        profile = ActingDriverProfile(
            user_id=user.id,
            full_name=full_name,
            phone=phone,
            photo_url=data.photo_url or user.profile_photo_url,
            city=data.city.strip(),
            service_area=(data.service_area or "").strip() or None,
            latitude=data.latitude,
            longitude=data.longitude,
            service_radius_km=data.service_radius_km or 15.0,
            dl_number=dl_number,
            dl_expiry_date=data.dl_expiry_date,
            dl_document_url=data.dl_document_url,
            dl_verified=True,
            dl_kyc_reference=dl_res.get("transaction_ref"),
            aadhaar_number=aadhaar or "",
            aadhaar_document_url=aadhaar_doc,
            aadhaar_verified=aadhaar_verified,
            aadhaar_kyc_reference=aadhaar_ref,
            kyc_provider=dl_res.get("provider"),
            kyc_verified_at=_utc_now_naive(),
            experience_years=data.experience_years,
            transmissions=transmissions,
            vehicle_categories=categories,
            languages=languages,
            trip_types=trip_types,
            status=DriverStatusEnum.PENDING_APPROVAL.value,
            is_available=True,
        )
        db.add(profile)

        # Keep the user's profile in sync (phone / photo) so the partner app shows it
        if not user.phone_number:
            user.phone_number = phone
        if data.photo_url and not user.profile_photo_url:
            user.profile_photo_url = data.photo_url

        _notify(
            db, user.id,
            "Driver application received",
            "Your Driving Licence was verified automatically. Our team will activate your profile shortly.",
            "DRIVER_APPLICATION_RECEIVED",
            "host",
        )
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def set_availability(db: Session, user: User, is_available: bool) -> ActingDriverProfile:
        p = DriverService.require_profile(db, user)
        p.is_available = bool(is_available)
        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def list_available_public(db: Session, city: Optional[str], transmission: Optional[str], car_type: Optional[str]) -> List[ActingDriverProfile]:
        q = db.query(ActingDriverProfile).filter(
            ActingDriverProfile.status == DriverStatusEnum.ACTIVE.value,
            ActingDriverProfile.is_available.is_(True),
        )
        if city:
            q = q.filter(func.lower(ActingDriverProfile.city) == city.strip().lower())
        drivers = q.order_by(ActingDriverProfile.rating.desc(), ActingDriverProfile.total_trips.desc()).all()
        if transmission and transmission.upper() not in ("ANY", ""):
            drivers = [d for d in drivers if _driver_handles_transmission(d, transmission)]
        if car_type and car_type.upper() not in ("ANY", ""):
            drivers = [d for d in drivers if _driver_handles_car(d, car_type)]
        return drivers

    @staticmethod
    def count_available(db: Session, city: Optional[str], car_type: Optional[str] = None, transmission: Optional[str] = None) -> int:
        return len(DriverService.list_available_public(db, city, transmission, car_type))

    # ----- pricing & estimate ----------------------------------------------

    @staticmethod
    def estimate(db: Session, start: datetime, end: datetime, car_type: str, city: Optional[str]) -> FareBreakdownOut:
        cfg = DriverPricing.get(db)
        fb = compute_fare(cfg, start, end, car_type)
        fb.available_drivers = DriverService.count_available(db, city, car_type)
        return fb

    # ----- customer booking -------------------------------------------------

    @staticmethod
    def create_booking(db: Session, customer: User, data: DriverBookingCreate) -> ActingDriverBooking:
        start = _to_naive_utc(data.start_time)
        end = _to_naive_utc(data.end_time)
        now = _utc_now_naive()
        if start < now - timedelta(minutes=10):
            raise HTTPException(status_code=400, detail="Pickup time cannot be in the past")
        if end <= start:
            raise HTTPException(status_code=400, detail="Trip end must be after the pickup time")
        if (end - start) > timedelta(days=7):
            raise HTTPException(status_code=400, detail="A single booking can be at most 7 days long")

        car_type = (data.car_type or "SEDAN").upper().strip()
        transmission = (data.transmission or "MANUAL").upper().strip()
        if transmission not in ALLOWED_TRANSMISSIONS:
            raise HTTPException(status_code=400, detail="Transmission must be MANUAL or AUTOMATIC")

        # A customer may have only one open request at a time per slot
        overlapping = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.customer_id == customer.id,
            ActingDriverBooking.status.in_([
                DriverBookingStatusEnum.REQUESTED.value,
                DriverBookingStatusEnum.DRIVER_ACCEPTED.value,
                DriverBookingStatusEnum.CONFIRMED.value,
                DriverBookingStatusEnum.TRIP_STARTED.value,
            ]),
            ActingDriverBooking.start_time < end,
            ActingDriverBooking.end_time > start,
        ).first()
        if overlapping:
            raise HTTPException(
                status_code=409,
                detail=f"You already have driver booking {overlapping.booking_reference} overlapping this time window",
            )

        cfg = DriverPricing.get(db)
        fb = compute_fare(cfg, start, end, car_type)

        booking = ActingDriverBooking(
            booking_reference=_gen_reference(db),
            customer_id=customer.id,
            pickup_address=data.pickup_address.strip(),
            pickup_city=data.pickup_city.strip(),
            pickup_latitude=data.pickup_latitude,
            pickup_longitude=data.pickup_longitude,
            drop_address=(data.drop_address or "").strip() or None,
            start_time=start,
            end_time=end,
            trip_type=fb.trip_type,
            car_type=car_type,
            transmission=transmission,
            seater=data.seater or 5,
            car_make_model=(data.car_make_model or "").strip() or None,
            car_registration=(data.car_registration or "").strip().upper() or None,
            notes=(data.notes or "").strip() or None,
            hourly_rate=fb.hourly_rate,
            car_multiplier=fb.car_multiplier,
            platform_fee_percent=fb.platform_fee_percent,
            tax_percent=fb.tax_percent,
            estimated_hours=fb.billable_hours,
            estimated_driver_fee=fb.driver_fee,
            estimated_platform_fee=fb.platform_fee,
            estimated_tax=fb.tax,
            estimated_total=fb.total,
            status=DriverBookingStatusEnum.REQUESTED.value,
        )
        db.add(booking)
        db.flush()

        # Broadcast to matching drivers in the city
        drivers = DriverService.list_available_public(db, booking.pickup_city, transmission, car_type)
        for d in drivers:
            _notify(
                db, d.user_id,
                "New trip request near you",
                f"{car_type.title()} ({transmission.title()}) pickup at {booking.pickup_address} on {start.strftime('%d %b, %H:%M')} UTC. Est. ₹{fb.driver_fee:.0f} driver fee.",
                "DRIVER_NEW_REQUEST",
                "host",
            )
        _notify(
            db, customer.id,
            "Driver request sent",
            f"We've alerted {len(drivers)} verified driver(s) in {booking.pickup_city}. You'll be notified as soon as one accepts.",
            "DRIVER_REQUEST_SENT",
        )
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def expire_stale(db: Session) -> None:
        """Requests nobody accepted before the trip window ended are expired."""
        now = _utc_now_naive()
        stale = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.status.in_([
                DriverBookingStatusEnum.REQUESTED.value,
                DriverBookingStatusEnum.DRIVER_ACCEPTED.value,
            ]),
            ActingDriverBooking.end_time < now,
        ).all()
        if not stale:
            return
        for b in stale:
            b.status = DriverBookingStatusEnum.EXPIRED.value
            b.cancelled_at = now
            b.cancelled_by = "SYSTEM"
            b.cancellation_reason = "No driver was confirmed before the trip window ended"
            _notify(db, b.customer_id, "Driver request expired", f"Booking {b.booking_reference} expired without a confirmed driver.", "DRIVER_REQUEST_EXPIRED")
        db.commit()

    @staticmethod
    def get_booking(db: Session, booking_id: int) -> ActingDriverBooking:
        b = db.query(ActingDriverBooking).filter(ActingDriverBooking.id == booking_id).first()
        if not b:
            raise HTTPException(status_code=404, detail="Driver booking not found")
        return b

    @staticmethod
    def get_booking_for_viewer(db: Session, booking_id: int, user: User) -> Tuple[ActingDriverBooking, str]:
        b = DriverService.get_booking(db, booking_id)
        if _is_admin(user):
            return b, "ADMIN"
        if b.customer_id == user.id:
            return b, "CUSTOMER"
        profile = DriverService.get_profile_by_user(db, user.id)
        if profile and b.driver_id == profile.id:
            return b, "DRIVER"
        if profile and b.status == DriverBookingStatusEnum.REQUESTED.value:
            return b, "DRIVER"  # open request – any driver may preview it
        raise HTTPException(status_code=403, detail="You do not have access to this booking")

    @staticmethod
    def list_customer_bookings(db: Session, customer: User) -> List[ActingDriverBooking]:
        DriverService.expire_stale(db)
        return db.query(ActingDriverBooking).filter(
            ActingDriverBooking.customer_id == customer.id
        ).order_by(ActingDriverBooking.created_at.desc()).all()

    @staticmethod
    def cancel_by_customer(db: Session, customer: User, booking_id: int, reason: Optional[str]) -> ActingDriverBooking:
        b = DriverService.get_booking(db, booking_id)
        if b.customer_id != customer.id and not _is_admin(customer):
            raise HTTPException(status_code=403, detail="Not your booking")
        if b.status not in (
            DriverBookingStatusEnum.REQUESTED.value,
            DriverBookingStatusEnum.DRIVER_ACCEPTED.value,
            DriverBookingStatusEnum.CONFIRMED.value,
        ):
            raise HTTPException(status_code=400, detail=f"Booking cannot be cancelled while it is {b.status}")

        now = _utc_now_naive()
        refund = 0.0
        if (b.amount_paid or 0) > 0:
            hours_until = (b.start_time - now).total_seconds() / 3600.0
            refund = b.amount_paid if hours_until >= 1.0 else _round_money(b.amount_paid * 0.5)
        b.refund_amount = refund
        b.status = DriverBookingStatusEnum.CANCELLED.value
        b.cancelled_by = "CUSTOMER"
        b.cancelled_at = now
        b.cancellation_reason = (reason or "").strip() or "Cancelled by customer"
        if b.driver:
            _notify(db, b.driver.user_id, "Trip cancelled by customer", f"Booking {b.booking_reference} was cancelled. {b.cancellation_reason}", "DRIVER_TRIP_CANCELLED", "host")
        _notify(db, b.customer_id, "Booking cancelled", f"Booking {b.booking_reference} cancelled." + (f" Refund of ₹{refund:.0f} will be processed to your original payment method." if refund else ""), "DRIVER_BOOKING_CANCELLED")
        db.commit()
        db.refresh(b)
        return b

    # ----- driver side -----------------------------------------------------

    @staticmethod
    def open_requests_for_driver(db: Session, driver: ActingDriverProfile) -> List[ActingDriverBooking]:
        DriverService.expire_stale(db)
        if driver.status != DriverStatusEnum.ACTIVE.value:
            return []
        now = _utc_now_naive()
        q = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.status == DriverBookingStatusEnum.REQUESTED.value,
            func.lower(ActingDriverBooking.pickup_city) == (driver.city or "").strip().lower(),
            ActingDriverBooking.end_time > now,
        ).order_by(ActingDriverBooking.start_time.asc())
        requests = q.all()
        return [
            r for r in requests
            if _driver_handles_transmission(driver, r.transmission) and _driver_handles_car(driver, r.car_type)
        ]

    @staticmethod
    def my_trips(db: Session, driver: ActingDriverProfile) -> List[ActingDriverBooking]:
        DriverService.expire_stale(db)
        return db.query(ActingDriverBooking).filter(
            ActingDriverBooking.driver_id == driver.id
        ).order_by(ActingDriverBooking.start_time.desc()).all()

    @staticmethod
    def accept_booking(db: Session, driver_user: User, booking_id: int) -> ActingDriverBooking:
        driver = DriverService.require_profile(db, driver_user)
        if driver.status != DriverStatusEnum.ACTIVE.value:
            raise HTTPException(status_code=403, detail="Your driver profile is not active yet. Please wait for admin approval.")
        if not driver.is_available:
            raise HTTPException(status_code=400, detail="You are currently offline. Go online to accept trips.")

        q = db.query(ActingDriverBooking).filter(ActingDriverBooking.id == booking_id)
        if not is_sqlite:
            q = q.with_for_update()
        b = q.first()
        if not b:
            raise HTTPException(status_code=404, detail="Request not found")
        if b.status != DriverBookingStatusEnum.REQUESTED.value:
            raise HTTPException(status_code=409, detail="This request was already taken by another driver")
        if b.customer_id == driver_user.id:
            raise HTTPException(status_code=400, detail="You cannot accept your own request")
        if not _driver_handles_transmission(driver, b.transmission) or not _driver_handles_car(driver, b.car_type):
            raise HTTPException(status_code=400, detail="This trip requires a transmission / car category you have not registered for")

        # Overlap check against the driver's other confirmed trips
        clash = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.driver_id == driver.id,
            ActingDriverBooking.id != b.id,
            ActingDriverBooking.status.in_(list(DRIVER_BUSY_STATUSES)),
            ActingDriverBooking.start_time < b.end_time,
            ActingDriverBooking.end_time > b.start_time,
        ).first()
        if clash:
            raise HTTPException(status_code=409, detail=f"You already have trip {clash.booking_reference} in this time window")

        now = _utc_now_naive()
        b.driver_id = driver.id
        b.accepted_at = now
        if (b.amount_paid or 0) >= (b.estimated_total or 0) and b.amount_paid > 0:
            # Already paid (previous driver released) – go straight to CONFIRMED with a fresh OTP
            b.status = DriverBookingStatusEnum.CONFIRMED.value
            b.start_otp = _gen_otp()
            b.start_otp_attempts = 0
            _notify(db, b.customer_id, "New driver confirmed", f"{_display_name(driver.full_name)} will drive you for {b.booking_reference}. Your start OTP is {b.start_otp}.", "DRIVER_CONFIRMED")
        else:
            b.status = DriverBookingStatusEnum.DRIVER_ACCEPTED.value
            _notify(
                db, b.customer_id,
                "Driver confirmed – complete payment",
                f"{_display_name(driver.full_name)} ({driver.rating:.1f}★, {driver.experience_years} yrs) accepted {b.booking_reference}. Pay ₹{b.estimated_total:.0f} to unlock the driver's contact details.",
                "DRIVER_ACCEPTED",
            )
        db.commit()
        db.refresh(b)
        return b

    @staticmethod
    def release_booking(db: Session, driver_user: User, booking_id: int, reason: Optional[str]) -> ActingDriverBooking:
        driver = DriverService.require_profile(db, driver_user)
        b = DriverService.get_booking(db, booking_id)
        if b.driver_id != driver.id:
            raise HTTPException(status_code=403, detail="This trip is not assigned to you")
        if b.status not in (DriverBookingStatusEnum.DRIVER_ACCEPTED.value, DriverBookingStatusEnum.CONFIRMED.value):
            raise HTTPException(status_code=400, detail=f"Trip cannot be released while it is {b.status}")
        b.driver_id = None
        b.accepted_at = None
        b.start_otp = None
        b.status = DriverBookingStatusEnum.REQUESTED.value
        _notify(
            db, b.customer_id,
            "Driver unavailable – re-matching",
            f"The driver for {b.booking_reference} is no longer available. We're alerting other verified drivers in {b.pickup_city}." + (" Your payment is safe and will carry over." if (b.amount_paid or 0) > 0 else ""),
            "DRIVER_RELEASED",
        )
        for d in DriverService.list_available_public(db, b.pickup_city, b.transmission, b.car_type):
            if d.id != driver.id:
                _notify(db, d.user_id, "Trip request re-opened", f"{b.car_type.title()} pickup at {b.pickup_address} is available again.", "DRIVER_NEW_REQUEST", "host")
        db.commit()
        db.refresh(b)
        return b

    @staticmethod
    def start_trip(db: Session, driver_user: User, booking_id: int, otp: str) -> ActingDriverBooking:
        driver = DriverService.require_profile(db, driver_user)
        b = DriverService.get_booking(db, booking_id)
        if b.driver_id != driver.id:
            raise HTTPException(status_code=403, detail="This trip is not assigned to you")
        if b.status != DriverBookingStatusEnum.CONFIRMED.value:
            if b.status == DriverBookingStatusEnum.DRIVER_ACCEPTED.value:
                raise HTTPException(status_code=400, detail="Customer has not completed payment yet")
            raise HTTPException(status_code=400, detail=f"Trip cannot be started while it is {b.status}")
        if (b.start_otp_attempts or 0) >= 5:
            raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Ask the customer to contact support.")
        if (otp or "").strip() != (b.start_otp or ""):
            b.start_otp_attempts = (b.start_otp_attempts or 0) + 1
            db.commit()
            raise HTTPException(status_code=400, detail="Incorrect start OTP. Please ask the customer for the 4-digit code shown in their app.")

        now = _utc_now_naive()
        b.trip_started_at = now
        b.status = DriverBookingStatusEnum.TRIP_STARTED.value
        b.end_otp = _gen_otp()
        b.end_otp_attempts = 0
        _notify(db, b.customer_id, "Trip started", f"Your trip {b.booking_reference} has started. Share the END OTP {b.end_otp} with the driver only when you reach your destination.", "DRIVER_TRIP_STARTED")
        db.commit()
        db.refresh(b)
        return b

    @staticmethod
    def end_trip(db: Session, driver_user: User, booking_id: int, otp: str) -> ActingDriverBooking:
        driver = DriverService.require_profile(db, driver_user)
        b = DriverService.get_booking(db, booking_id)
        if b.driver_id != driver.id:
            raise HTTPException(status_code=403, detail="This trip is not assigned to you")
        if b.status != DriverBookingStatusEnum.TRIP_STARTED.value:
            raise HTTPException(status_code=400, detail=f"Trip cannot be ended while it is {b.status}")
        if (b.end_otp_attempts or 0) >= 5:
            raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please contact support.")
        if (otp or "").strip() != (b.end_otp or ""):
            b.end_otp_attempts = (b.end_otp_attempts or 0) + 1
            db.commit()
            raise HTTPException(status_code=400, detail="Incorrect end OTP. Please ask the customer for the 4-digit END code.")

        cfg = DriverPricing.get(db)
        now = _utc_now_naive()
        started = b.trip_started_at or b.start_time
        ended = max(now, started + timedelta(minutes=1))
        fb = _settlement_fare(b, cfg, started, ended)

        b.trip_ended_at = now
        b.actual_hours = round((ended - started).total_seconds() / 3600.0, 2)
        b.billable_hours = fb.billable_hours
        b.overtime_hours = round(max(0.0, fb.billable_hours - (b.estimated_hours or 0.0)), 2)
        b.final_driver_fee = fb.driver_fee
        b.final_platform_fee = fb.platform_fee
        b.final_tax = fb.tax
        b.final_total = fb.total
        balance = _round_money(max(0.0, fb.total - (b.amount_paid or 0.0)))
        b.balance_due = balance

        if balance >= 1.0:
            b.status = DriverBookingStatusEnum.PAYMENT_DUE.value
            _notify(
                db, b.customer_id,
                "Trip ended – overtime balance due",
                f"Trip {b.booking_reference} ran {b.overtime_hours:.1f} hr over the booked duration. Please pay the remaining ₹{balance:.0f} to close the trip.",
                "DRIVER_PAYMENT_DUE",
            )
        else:
            DriverService._complete(db, b)
        db.commit()
        db.refresh(b)
        return b

    @staticmethod
    def _complete(db: Session, b: ActingDriverBooking) -> None:
        b.status = DriverBookingStatusEnum.COMPLETED.value
        b.balance_due = 0.0
        b.driver_earning = _round_money(b.final_driver_fee or b.estimated_driver_fee or 0.0)
        if b.driver:
            b.driver.total_trips = (b.driver.total_trips or 0) + 1
            b.driver.total_earnings = _round_money((b.driver.total_earnings or 0.0) + b.driver_earning)
            _notify(db, b.driver.user_id, "Trip completed – earnings credited", f"₹{b.driver_earning:.0f} credited for {b.booking_reference}. Great drive!", "DRIVER_TRIP_COMPLETED", "host")
        _notify(db, b.customer_id, "Trip completed", f"Thanks for riding with ParkCo. Total paid for {b.booking_reference}: ₹{(b.amount_paid or 0):.0f}. Rate your driver in the app.", "DRIVER_TRIP_COMPLETED")

    @staticmethod
    def earnings(db: Session, driver: ActingDriverProfile) -> DriverEarningsOut:
        now = _utc_now_naive()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        completed_q = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.driver_id == driver.id,
            ActingDriverBooking.status == DriverBookingStatusEnum.COMPLETED.value,
        )
        month_rows = completed_q.filter(ActingDriverBooking.trip_ended_at >= month_start).all()
        upcoming = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.driver_id == driver.id,
            ActingDriverBooking.status.in_([DriverBookingStatusEnum.DRIVER_ACCEPTED.value, DriverBookingStatusEnum.CONFIRMED.value]),
        ).count()
        active = db.query(ActingDriverBooking).filter(
            ActingDriverBooking.driver_id == driver.id,
            ActingDriverBooking.status == DriverBookingStatusEnum.TRIP_STARTED.value,
        ).first()
        return DriverEarningsOut(
            total_earnings=_round_money(driver.total_earnings or 0.0),
            total_trips=driver.total_trips or 0,
            this_month_earnings=_round_money(sum((r.driver_earning or 0.0) for r in month_rows)),
            this_month_trips=len(month_rows),
            pending_requests=len(DriverService.open_requests_for_driver(db, driver)),
            upcoming_trips=upcoming,
            active_trip_id=active.id if active else None,
            rating=round(float(driver.rating or 5.0), 1),
            rating_count=driver.rating_count or 0,
        )

    # ----- payments ----------------------------------------------------------

    @staticmethod
    def create_payment_order(db: Session, customer: User, booking_id: int) -> dict:
        b = DriverService.get_booking(db, booking_id)
        if b.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not your booking")

        if b.status == DriverBookingStatusEnum.DRIVER_ACCEPTED.value:
            purpose = DriverPaymentPurposeEnum.ADVANCE.value
            amount = _round_money(b.estimated_total)
            description = f"Acting driver advance – {b.booking_reference}"
        elif b.status == DriverBookingStatusEnum.PAYMENT_DUE.value:
            purpose = DriverPaymentPurposeEnum.BALANCE.value
            amount = _round_money(b.balance_due or 0.0)
            description = f"Overtime balance – {b.booking_reference}"
        elif b.status == DriverBookingStatusEnum.REQUESTED.value:
            raise HTTPException(status_code=400, detail="Please wait for a driver to accept before paying")
        else:
            raise HTTPException(status_code=400, detail=f"No payment is due while the booking is {b.status}")

        if amount < 1.0:
            raise HTTPException(status_code=400, detail="Nothing to pay")

        amount_in_paise = max(100, int(round(amount * 100)))
        order_id = f"order_adr_{random.randint(1000000, 9999999)}"

        if not settings.RAZORPAY_MOCK_MODE:
            try:
                import httpx
                res = httpx.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                    json={
                        "amount": amount_in_paise,
                        "currency": "INR",
                        "receipt": f"adr_{b.id}_{purpose.lower()}_{random.randint(1000, 9999)}",
                        "notes": {
                            "driver_booking_id": str(b.id),
                            "booking_reference": b.booking_reference,
                            "purpose": purpose,
                            "user_id": str(customer.id),
                        },
                    },
                    timeout=10.0,
                )
                if res.status_code in (200, 201):
                    order_id = res.json().get("id", order_id)
                else:
                    print(f"[drivers] Razorpay order creation response ({res.status_code}): {res.text}")
            except Exception as e:  # network issues → fall back to local order id (verified later by HMAC/API)
                print(f"[drivers] Razorpay order exception: {e}")

        # Reuse a pending payment record for the same purpose if it exists
        pending = db.query(ActingDriverPayment).filter(
            ActingDriverPayment.booking_id == b.id,
            ActingDriverPayment.purpose == purpose,
            ActingDriverPayment.status == "PENDING",
        ).first()
        if pending:
            pending.order_id = order_id
            pending.amount = amount
            payment = pending
        else:
            payment = ActingDriverPayment(
                booking_id=b.id,
                order_id=order_id,
                provider="MOCK" if settings.RAZORPAY_MOCK_MODE else "RAZORPAY",
                purpose=purpose,
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
            "purpose": purpose,
            "amount": amount,
            "amount_in_paise": amount_in_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "mock_mode": settings.RAZORPAY_MOCK_MODE,
            "description": description,
        }

    @staticmethod
    def verify_payment(db: Session, customer: User, booking_id: int, order_id: str, payment_id: str, signature: str) -> ActingDriverBooking:
        b = DriverService.get_booking(db, booking_id)
        if b.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not your booking")

        payment = db.query(ActingDriverPayment).filter(
            ActingDriverPayment.booking_id == b.id,
            ActingDriverPayment.order_id == order_id,
        ).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment order not found for this booking")
        if payment.status == "PAID":
            return b  # idempotent

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
            raise HTTPException(status_code=400, detail="Payment verification failed: invalid Razorpay signature")

        payment.payment_id = payment_id
        payment.signature = signature
        payment.status = "PAID"
        now = _utc_now_naive()
        b.amount_paid = _round_money((b.amount_paid or 0.0) + payment.amount)

        if payment.purpose == DriverPaymentPurposeEnum.ADVANCE.value:
            if b.status != DriverBookingStatusEnum.DRIVER_ACCEPTED.value:
                # Driver may have released in between – keep the money on the booking, it carries over
                db.commit()
                db.refresh(b)
                return b
            b.status = DriverBookingStatusEnum.CONFIRMED.value
            b.paid_at = now
            b.start_otp = _gen_otp()
            b.start_otp_attempts = 0
            if b.driver:
                _notify(
                    db, b.driver.user_id,
                    "Payment received – trip confirmed",
                    f"{b.customer.full_name if b.customer else 'Customer'} paid for {b.booking_reference}. Pickup: {b.pickup_address}. Contact details are now visible in your trips.",
                    "DRIVER_TRIP_CONFIRMED",
                    "host",
                )
            _notify(
                db, b.customer_id,
                "Payment successful – driver details unlocked",
                f"Your driver's contact is now visible. Share START OTP {b.start_otp} with the driver only when they arrive.",
                "DRIVER_PAYMENT_SUCCESS",
            )
        else:  # BALANCE
            if b.status == DriverBookingStatusEnum.PAYMENT_DUE.value:
                DriverService._complete(db, b)

        db.commit()
        db.refresh(b)
        return b

    @staticmethod
    def rate_trip(db: Session, customer: User, booking_id: int, rating: int, comment: Optional[str]) -> ActingDriverBooking:
        b = DriverService.get_booking(db, booking_id)
        if b.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Not your booking")
        if b.status != DriverBookingStatusEnum.COMPLETED.value:
            raise HTTPException(status_code=400, detail="You can rate the driver once the trip is completed")
        if b.customer_rating:
            raise HTTPException(status_code=400, detail="You have already rated this trip")
        b.customer_rating = int(rating)
        b.customer_review = (comment or "").strip() or None
        if b.driver:
            d = b.driver
            count = d.rating_count or 0
            current = float(d.rating or 5.0)
            d.rating = round(((current * count) + rating) / (count + 1), 2) if count > 0 else float(rating)
            d.rating_count = count + 1
        db.commit()
        db.refresh(b)
        return b

    # ----- admin ---------------------------------------------------------------

    @staticmethod
    def admin_list_drivers(db: Session, status_filter: Optional[str], city: Optional[str]) -> List[ActingDriverProfile]:
        q = db.query(ActingDriverProfile)
        if status_filter and status_filter.upper() != "ALL":
            q = q.filter(ActingDriverProfile.status == status_filter.upper())
        if city:
            q = q.filter(func.lower(ActingDriverProfile.city) == city.strip().lower())
        return q.order_by(ActingDriverProfile.created_at.desc()).all()

    @staticmethod
    def admin_update_status(db: Session, admin: User, driver_id: int, new_status: str, reason: Optional[str]) -> ActingDriverProfile:
        p = db.query(ActingDriverProfile).filter(ActingDriverProfile.id == driver_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Driver not found")
        new_status = (new_status or "").upper().strip()
        if new_status not in [s.value for s in DriverStatusEnum]:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {', '.join(s.value for s in DriverStatusEnum)}")
        p.status = new_status
        if new_status == DriverStatusEnum.ACTIVE.value:
            p.approved_at = _utc_now_naive()
            p.rejection_reason = None
            _notify(db, p.user_id, "You're approved!", "Your acting driver profile is now ACTIVE. Go online in the Partner app to start receiving trip requests.", "DRIVER_APPROVED", "host")
        elif new_status == DriverStatusEnum.REJECTED.value:
            p.rejection_reason = (reason or "").strip() or "Application did not meet partner requirements"
            _notify(db, p.user_id, "Driver application update", f"Your application was not approved. Reason: {p.rejection_reason}", "DRIVER_REJECTED", "host")
        elif new_status == DriverStatusEnum.SUSPENDED.value:
            p.rejection_reason = (reason or "").strip() or "Suspended by platform admin"
            p.is_available = False
            _notify(db, p.user_id, "Driver profile suspended", f"Your profile has been suspended. Reason: {p.rejection_reason}", "DRIVER_SUSPENDED", "host")
        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def admin_list_bookings(db: Session, status_filter: Optional[str], limit: int = 300) -> List[ActingDriverBooking]:
        DriverService.expire_stale(db)
        q = db.query(ActingDriverBooking)
        if status_filter and status_filter.upper() != "ALL":
            q = q.filter(ActingDriverBooking.status == status_filter.upper())
        return q.order_by(ActingDriverBooking.created_at.desc()).limit(limit).all()

    @staticmethod
    def admin_summary(db: Session) -> DriverAdminSummaryOut:
        total = db.query(ActingDriverProfile).count()
        active = db.query(ActingDriverProfile).filter(ActingDriverProfile.status == DriverStatusEnum.ACTIVE.value).count()
        pending = db.query(ActingDriverProfile).filter(ActingDriverProfile.status == DriverStatusEnum.PENDING_APPROVAL.value).count()
        suspended = db.query(ActingDriverProfile).filter(ActingDriverProfile.status == DriverStatusEnum.SUSPENDED.value).count()
        online = db.query(ActingDriverProfile).filter(
            ActingDriverProfile.status == DriverStatusEnum.ACTIVE.value,
            ActingDriverProfile.is_available.is_(True),
        ).count()
        total_bookings = db.query(ActingDriverBooking).count()
        open_requests = db.query(ActingDriverBooking).filter(ActingDriverBooking.status == DriverBookingStatusEnum.REQUESTED.value).count()
        live = db.query(ActingDriverBooking).filter(ActingDriverBooking.status == DriverBookingStatusEnum.TRIP_STARTED.value).count()
        completed = db.query(ActingDriverBooking).filter(ActingDriverBooking.status == DriverBookingStatusEnum.COMPLETED.value).count()
        gross = float(db.query(func.coalesce(func.sum(ActingDriverPayment.amount), 0.0)).filter(ActingDriverPayment.status == "PAID").scalar() or 0.0)
        commission = float(db.query(func.coalesce(func.sum(ActingDriverBooking.final_platform_fee), 0.0)).filter(ActingDriverBooking.status == DriverBookingStatusEnum.COMPLETED.value).scalar() or 0.0)
        payouts = float(db.query(func.coalesce(func.sum(ActingDriverBooking.driver_earning), 0.0)).filter(ActingDriverBooking.status == DriverBookingStatusEnum.COMPLETED.value).scalar() or 0.0)
        return DriverAdminSummaryOut(
            total_drivers=total,
            active_drivers=active,
            pending_drivers=pending,
            suspended_drivers=suspended,
            online_drivers=online,
            total_bookings=total_bookings,
            open_requests=open_requests,
            live_trips=live,
            completed_trips=completed,
            gross_collected=_round_money(gross),
            platform_commission=_round_money(commission),
            driver_payouts=_round_money(payouts),
        )

    # ----- legacy helpers used by the admin stats endpoint ------------------

    @staticmethod
    def get_total_revenue(db: Session) -> float:
        return float(db.query(func.coalesce(func.sum(ActingDriverPayment.amount), 0.0)).filter(ActingDriverPayment.status == "PAID").scalar() or 0.0)

    @staticmethod
    def get_total_trips(db: Session) -> int:
        return db.query(ActingDriverBooking).filter(
            ActingDriverBooking.status.in_([
                DriverBookingStatusEnum.CONFIRMED.value,
                DriverBookingStatusEnum.TRIP_STARTED.value,
                DriverBookingStatusEnum.PAYMENT_DUE.value,
                DriverBookingStatusEnum.COMPLETED.value,
            ])
        ).count()


# ---------------------------------------------------------------------------
# matching helpers
# ---------------------------------------------------------------------------

def _driver_handles_transmission(driver: ActingDriverProfile, transmission: str) -> bool:
    wanted = (transmission or "").upper().strip()
    if wanted in ("", "ANY"):
        return True
    have = {str(t).upper().strip() for t in (driver.transmissions or [])}
    if not have:
        return True
    if wanted == "AUTOMATIC":
        return any(h.startswith("AUTO") or h.startswith("EV") or "DCT" in h or "AMT" in h for h in have)
    if wanted == "MANUAL":
        return any(h.startswith("MANUAL") for h in have)
    return wanted in have


def _driver_handles_car(driver: ActingDriverProfile, car_type: str) -> bool:
    wanted = (car_type or "").upper().strip()
    if wanted in ("", "ANY"):
        return True
    have = {str(c).upper().strip() for c in (driver.vehicle_categories or [])}
    if not have:
        return True
    if wanted in have:
        return True
    # LUXURY drivers can handle everything; SUV drivers can also do sedans/hatchbacks
    if "LUXURY" in have:
        return True
    if wanted in ("HATCHBACK", "SEDAN") and ("SUV" in have or "SEDAN" in have):
        return True
    return False
