from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRoleEnum
from app.schemas.driver import (
    DriverRegistrationCreate,
    DriverProfileOut,
    DriverPublicOut,
    DriverAvailabilityUpdate,
    DriverStatusAction,
    DriverEarningsOut,
    DriverPricingOut,
    DriverPricingUpdate,
    DriverEstimateRequest,
    FareBreakdownOut,
    DriverBookingCreate,
    DriverBookingCancel,
    DriverBookingOut,
    TripOtpRequest,
    DriverPaymentOrderOut,
    DriverPaymentVerifyRequest,
    DriverTripRating,
    DriverAdminSummaryOut,
)
from app.services.driver_service import (
    DriverService,
    DriverPricing,
    serialize_driver_full,
    serialize_driver_public,
    serialize_booking,
)

router = APIRouter(prefix="/drivers", tags=["Acting Drivers"])


# ---------------------------------------------------------------------------
# Public / customer discovery
# ---------------------------------------------------------------------------

@router.get("/pricing", response_model=DriverPricingOut)
def get_pricing(db: Session = Depends(get_db)):
    """Admin-defined hourly rate, platform fee, tax and car-type multipliers (read-only for apps)."""
    return DriverPricing.to_out(DriverPricing.get(db))


@router.post("/estimate", response_model=FareBreakdownOut)
def estimate_fare(data: DriverEstimateRequest, db: Session = Depends(get_db)):
    """Fare estimate for a time window + car type, plus how many verified drivers are online in the city."""
    return DriverService.estimate(db, data.start_time, data.end_time, data.car_type, data.pickup_city)


@router.get("/available", response_model=List[DriverPublicOut])
def get_available_drivers(
    city: Optional[str] = Query(None),
    transmission: Optional[str] = Query(None, description="ANY, MANUAL, AUTOMATIC"),
    car_type: Optional[str] = Query(None, description="HATCHBACK, SEDAN, SUV, LUXURY, VAN"),
    db: Session = Depends(get_db),
):
    """Privacy-safe list of ACTIVE + online drivers (names abbreviated, no phone numbers)."""
    return [serialize_driver_public(d) for d in DriverService.list_available_public(db, city, transmission, car_type)]


# ---------------------------------------------------------------------------
# Driver partner (host app) – all require an authenticated user
# ---------------------------------------------------------------------------

@router.post("/register", response_model=DriverProfileOut, status_code=status.HTTP_201_CREATED)
def register_driver(
    data: DriverRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register the logged-in partner as an acting driver. DL + Aadhaar go through automated KYC."""
    return serialize_driver_full(DriverService.register_driver(db, current_user, data))


@router.get("/me", response_model=DriverProfileOut)
def get_my_driver_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_driver_full(DriverService.require_profile(db, current_user))


@router.post("/me/availability", response_model=DriverProfileOut)
def set_my_availability(
    data: DriverAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return serialize_driver_full(DriverService.set_availability(db, current_user, data.is_available))


@router.get("/me/earnings", response_model=DriverEarningsOut)
def get_my_earnings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DriverService.earnings(db, DriverService.require_profile(db, current_user))


@router.get("/me/requests", response_model=List[DriverBookingOut])
def get_open_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Open trip requests in the driver's city matching their transmission / car skills."""
    profile = DriverService.require_profile(db, current_user)
    cfg = DriverPricing.get(db)
    return [serialize_booking(b, "DRIVER", cfg) for b in DriverService.open_requests_for_driver(db, profile)]


@router.get("/me/trips", response_model=List[DriverBookingOut])
def get_my_trips(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = DriverService.require_profile(db, current_user)
    cfg = DriverPricing.get(db)
    return [serialize_booking(b, "DRIVER", cfg) for b in DriverService.my_trips(db, profile)]


@router.post("/bookings/{booking_id}/accept", response_model=DriverBookingOut)
def accept_request(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = DriverService.accept_booking(db, current_user, booking_id)
    return serialize_booking(b, "DRIVER", DriverPricing.get(db))


@router.post("/bookings/{booking_id}/release", response_model=DriverBookingOut)
def release_request(
    booking_id: int,
    data: DriverBookingCancel = DriverBookingCancel(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = DriverService.release_booking(db, current_user, booking_id, data.reason)
    return serialize_booking(b, "DRIVER", DriverPricing.get(db))


@router.post("/bookings/{booking_id}/start", response_model=DriverBookingOut)
def start_trip(booking_id: int, data: TripOtpRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Driver has arrived: verify the customer's START OTP and begin the meter."""
    b = DriverService.start_trip(db, current_user, booking_id, data.otp)
    return serialize_booking(b, "DRIVER", DriverPricing.get(db))


@router.post("/bookings/{booking_id}/end", response_model=DriverBookingOut)
def end_trip(booking_id: int, data: TripOtpRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify the customer's END OTP, compute the final fare from actual start→end, settle or raise balance."""
    b = DriverService.end_trip(db, current_user, booking_id, data.otp)
    return serialize_booking(b, "DRIVER", DriverPricing.get(db))


# ---------------------------------------------------------------------------
# Customer bookings
# ---------------------------------------------------------------------------

@router.post("/bookings", response_model=DriverBookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(data: DriverBookingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = DriverService.create_booking(db, current_user, data)
    return serialize_booking(b, "CUSTOMER", DriverPricing.get(db))


@router.get("/bookings/my", response_model=List[DriverBookingOut])
def my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cfg = DriverPricing.get(db)
    return [serialize_booking(b, "CUSTOMER", cfg) for b in DriverService.list_customer_bookings(db, current_user)]


@router.get("/bookings/{booking_id}", response_model=DriverBookingOut)
def get_booking(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    DriverService.expire_stale(db)
    b, viewer = DriverService.get_booking_for_viewer(db, booking_id, current_user)
    return serialize_booking(b, viewer, DriverPricing.get(db))


@router.post("/bookings/{booking_id}/cancel", response_model=DriverBookingOut)
def cancel_booking(
    booking_id: int,
    data: DriverBookingCancel = DriverBookingCancel(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = DriverService.cancel_by_customer(db, current_user, booking_id, data.reason)
    return serialize_booking(b, "CUSTOMER", DriverPricing.get(db))


@router.post("/bookings/{booking_id}/pay/create-order", response_model=DriverPaymentOrderOut)
def create_payment_order(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DriverService.create_payment_order(db, current_user, booking_id)


@router.post("/bookings/{booking_id}/pay/verify", response_model=DriverBookingOut)
def verify_payment(
    booking_id: int,
    data: DriverPaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = DriverService.verify_payment(db, current_user, booking_id, data.order_id, data.payment_id, data.signature)
    return serialize_booking(b, "CUSTOMER", DriverPricing.get(db))


@router.post("/bookings/{booking_id}/rate", response_model=DriverBookingOut)
def rate_trip(booking_id: int, data: DriverTripRating, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = DriverService.rate_trip(db, current_user, booking_id, data.rating, data.comment)
    return serialize_booking(b, "CUSTOMER", DriverPricing.get(db))


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@router.get("/all", response_model=List[DriverProfileOut])
def admin_list_drivers(
    status: Optional[str] = Query(None, description="ALL, ACTIVE, PENDING_APPROVAL, SUSPENDED, REJECTED"),
    city: Optional[str] = Query(None),
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return [serialize_driver_full(d) for d in DriverService.admin_list_drivers(db, status, city)]


@router.post("/{driver_id}/status", response_model=DriverProfileOut)
def admin_update_driver_status(
    driver_id: int,
    action: DriverStatusAction,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return serialize_driver_full(DriverService.admin_update_status(db, current_user, driver_id, action.status, action.reason))


@router.get("/admin/bookings", response_model=List[DriverBookingOut])
def admin_list_bookings(
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    cfg = DriverPricing.get(db)
    return [serialize_booking(b, "ADMIN", cfg) for b in DriverService.admin_list_bookings(db, status)]


@router.get("/admin/summary", response_model=DriverAdminSummaryOut)
def admin_summary(current_user: User = Depends(require_role(UserRoleEnum.ADMIN)), db: Session = Depends(get_db)):
    return DriverService.admin_summary(db)


@router.put("/admin/pricing", response_model=DriverPricingOut)
def admin_update_pricing(
    data: DriverPricingUpdate,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return DriverPricing.update(db, current_user, data)
