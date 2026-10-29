from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, get_optional_current_user, require_role
from app.models.account import Host, Admin
from app.models.user import User, UserRoleEnum
from app.schemas.car_spa import (
    CarSpaAssignSlot,
    CarSpaBookingCreate,
    CarSpaBookingOut,
    CarSpaCenterCreate,
    CarSpaCenterOut,
    CarSpaCenterUpdate,
    CarSpaPaymentOrderOut,
    CarSpaPaymentVerifyRequest,
    CarSpaServiceCreate,
    CarSpaServiceOut,
    CarSpaServiceUpdate,
    CarSpaStatusAction,
)
from app.services.car_spa_service import CarSpaServiceApp, serialize_booking, serialize_center

router = APIRouter(prefix="/car-spa", tags=["Car Spa & Detailing"])


def _as_host(account) -> Host:
    if not isinstance(account, Host):
        raise HTTPException(status_code=403, detail="Host account required")
    return account


def _as_customer(account) -> User:
    if type(account).__name__ != "User":
        raise HTTPException(status_code=403, detail="Customer account required")
    return account


def _is_admin_account(account) -> bool:
    if isinstance(account, Admin):
        return True
    return any(
        getattr(getattr(r, "role", None), "value", getattr(r, "role", None)) == "ADMIN"
        for r in getattr(account, "roles", []) or []
    )


# ---------------------------------------------------------------------------
# Host center + services (static paths before {id})
# ---------------------------------------------------------------------------

@router.get("/centers/me", response_model=CarSpaCenterOut)
def my_center(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    host = _as_host(current_user)
    center = CarSpaServiceApp.get_host_center(db, host.id)
    if not center:
        raise HTTPException(status_code=404, detail="No car spa registered yet")
    return serialize_center(center, reveal_contact=True, include_inactive_services=True)


@router.put("/centers/me", response_model=CarSpaCenterOut)
def update_my_center(
    data: CarSpaCenterUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.update_center(db, _as_host(current_user), data)


@router.post("/centers/me/services", response_model=CarSpaServiceOut, status_code=status.HTTP_201_CREATED)
def add_service(
    data: CarSpaServiceCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.add_service(db, _as_host(current_user), data)


@router.put("/centers/me/services/{service_id}", response_model=CarSpaServiceOut)
def update_service(
    service_id: int,
    data: CarSpaServiceUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.update_service(db, _as_host(current_user), service_id, data)


@router.delete("/centers/me/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    CarSpaServiceApp.delete_service(db, _as_host(current_user), service_id)
    return None


@router.post("/centers", response_model=CarSpaCenterOut, status_code=status.HTTP_201_CREATED)
def register_center(
    data: CarSpaCenterCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.register_center(db, _as_host(current_user), data)


@router.post("/register", response_model=CarSpaCenterOut, status_code=status.HTTP_201_CREATED)
def register_center_legacy(
    data: CarSpaCenterCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.register_center(db, _as_host(current_user), data)


# ---------------------------------------------------------------------------
# Public / customer discovery
# ---------------------------------------------------------------------------

@router.get("/centers", response_model=List[CarSpaCenterOut])
def list_centers(
    city: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.list_public_centers(db, city=city, lat=lat, lng=lng)


@router.get("/centers/{center_id}", response_model=CarSpaCenterOut)
def get_center(
    center_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    customer = current_user if type(current_user).__name__ == "User" else None
    return CarSpaServiceApp.get_public_center(db, center_id, customer=customer)


@router.get("/all", response_model=List[CarSpaCenterOut])
def get_all_spas_legacy(
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not _is_admin_account(current_user):
        return CarSpaServiceApp.list_public_centers(db, city=city)
    return CarSpaServiceApp.list_admin_centers(db, status=status, city=city)


@router.get("/packages")
def get_packages_legacy():
    return []


# ---------------------------------------------------------------------------
# Bookings (static paths before {id})
# ---------------------------------------------------------------------------

@router.get("/bookings/my", response_model=List[CarSpaBookingOut])
def my_bookings(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return CarSpaServiceApp.list_customer_bookings(db, _as_customer(current_user))


@router.get("/bookings/incoming", response_model=List[CarSpaBookingOut])
def incoming_bookings(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return CarSpaServiceApp.list_incoming_bookings(db, _as_host(current_user))


@router.post("/bookings", response_model=CarSpaBookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    data: CarSpaBookingCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.create_booking(db, _as_customer(current_user), data)


@router.post("/book", response_model=CarSpaBookingOut, status_code=status.HTTP_201_CREATED)
def book_legacy(
    data: CarSpaBookingCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.create_booking(db, _as_customer(current_user), data)


@router.get("/bookings/{booking_id}", response_model=CarSpaBookingOut)
def get_booking(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = CarSpaServiceApp.get_booking(db, booking_id)
    if _is_admin_account(current_user):
        return serialize_booking(b, viewer="ADMIN", include_customer=True)
    if isinstance(current_user, Host):
        center = CarSpaServiceApp.get_host_center(db, current_user.id)
        if not center or center.id != b.center_id:
            raise HTTPException(status_code=403, detail="Not your booking")
        return serialize_booking(b, viewer="HOST", include_customer=True)
    if type(current_user).__name__ == "User" and b.customer_id == current_user.id:
        return serialize_booking(b, viewer="CUSTOMER")
    raise HTTPException(status_code=403, detail="Not your booking")


@router.post("/bookings/{booking_id}/pay/create-order", response_model=CarSpaPaymentOrderOut)
def create_payment_order(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.create_payment_order(db, _as_customer(current_user), booking_id)


@router.post("/bookings/{booking_id}/pay/verify", response_model=CarSpaBookingOut)
def verify_payment(
    booking_id: int,
    data: CarSpaPaymentVerifyRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.verify_payment(
        db, _as_customer(current_user), booking_id, data.order_id, data.payment_id, data.signature
    )


@router.post("/bookings/{booking_id}/assign-slot", response_model=CarSpaBookingOut)
def assign_slot(
    booking_id: int,
    data: CarSpaAssignSlot,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.assign_slot(db, _as_host(current_user), booking_id, data)


@router.post("/bookings/{booking_id}/cancel", response_model=CarSpaBookingOut)
def cancel_booking(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.cancel_by_customer(db, _as_customer(current_user), booking_id)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@router.get("/admin/centers", response_model=List[CarSpaCenterOut])
def admin_centers(
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    current_user=Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.list_admin_centers(db, status=status, city=city)


@router.post("/admin/centers/{center_id}/status", response_model=CarSpaCenterOut)
def admin_update_status(
    center_id: int,
    action: CarSpaStatusAction,
    current_user=Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.update_status(db, center_id, action.status, action.reason)


@router.post("/{spa_id}/status", response_model=CarSpaCenterOut)
def admin_update_status_legacy(
    spa_id: Union[int, str],
    action: CarSpaStatusAction,
    current_user=Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    try:
        cid = int(spa_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid spa id")
    return CarSpaServiceApp.update_status(db, cid, action.status, action.reason)


@router.get("/admin/bookings", response_model=List[CarSpaBookingOut])
def admin_bookings(
    current_user=Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return CarSpaServiceApp.list_admin_bookings(db)
