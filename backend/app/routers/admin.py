from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.schemas.admin import AdminStatsOut, ListingApprovalAction, ServiceClassificationOut, ClassifiedTransactionOut
from app.schemas.listing import ListingOut
from app.services.listing_service import ListingService
from app.dependencies.auth import require_role, account_kind
from app.models.user import User, UserRoleEnum
from app.models.account import Host, Admin
from app.models.listing import ParkingListing, ListingStatusEnum
from app.models.booking import Booking, BookingStatusEnum
from app.models.payment import Payment, PaymentStatusEnum

router = APIRouter(prefix="/admin", tags=["Admin Platform Control"])

@router.get("/stats", response_model=AdminStatsOut)
def get_admin_stats(
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_hosts = db.query(Host).count()
    total_listings = db.query(ParkingListing).count()
    pending_listings = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.PENDING_APPROVAL).count()
    parking_bookings = db.query(Booking).count()
    active_bookings = db.query(Booking).filter(Booking.status == BookingStatusEnum.ACTIVE).count()

    # 1. Parking Service Financials
    parking_revenue = float(db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatusEnum.PAID).scalar() or 0.0)
    parking_commission = float(db.query(func.sum(Payment.platform_commission)).filter(Payment.status == PaymentStatusEnum.PAID).scalar() or 0.0)
    parking_payouts = float(db.query(func.sum(Payment.host_gross_earning)).filter(Payment.status == PaymentStatusEnum.PAID).scalar() or 0.0)
    if parking_revenue > 0 and parking_commission == 0:
        parking_commission = round(parking_revenue * 0.10, 2)
        parking_payouts = round(parking_revenue * 0.90, 2)

    # 2. Acting Drivers Service Financials (DB-backed)
    from app.services.driver_service import DriverService
    from app.models.driver import ActingDriverProfile, ActingDriverBooking, DriverBookingStatusEnum
    driver_summary = DriverService.admin_summary(db)
    total_drivers = driver_summary.total_drivers
    driver_revenue = driver_summary.gross_collected
    driver_trips = DriverService.get_total_trips(db)
    driver_commission = driver_summary.platform_commission
    driver_payouts = driver_summary.driver_payouts
    if driver_revenue > 0 and driver_commission == 0:
        driver_commission = round(driver_revenue * 0.10, 2)
        driver_payouts = round(driver_revenue * 0.90, 2)

    # 3. Car Spa & Detailing Service Financials
    from app.services.car_spa_service import CarSpaServiceApp
    from app.models.car_spa import CarSpaStatusEnum
    total_car_spas = CarSpaServiceApp.count_centers(db, status=CarSpaStatusEnum.ACTIVE.value)
    spa_revenue = float(CarSpaServiceApp.get_total_revenue(db))
    spa_orders = CarSpaServiceApp.get_total_bookings(db)
    spa_commission = round(spa_revenue * 0.10, 2)
    spa_payouts = round(spa_revenue * 0.90, 2)

    # 4. Multi-Service Aggregated Totals
    total_revenue = round(parking_revenue + driver_revenue + spa_revenue, 2)
    total_commission = round(parking_commission + driver_commission + spa_commission, 2)
    total_payouts = round(parking_payouts + driver_payouts + spa_payouts, 2)
    total_bookings = parking_bookings + driver_trips + spa_orders

    # 5. Calculate Revenue Contribution Percentages
    parking_pct = round((parking_revenue / total_revenue * 100), 1) if total_revenue > 0 else 0.0
    driver_pct = round((driver_revenue / total_revenue * 100), 1) if total_revenue > 0 else 0.0
    spa_pct = round((spa_revenue / total_revenue * 100), 1) if total_revenue > 0 else 0.0

    # 6. Service Classification Breakdown
    services_classification = [
        ServiceClassificationOut(
            service_id="PARKING",
            service_name="Parking Radar & Spaces",
            short_name="Parking Radar",
            category="Driveways & Garages",
            icon="",
            gross_collected=parking_revenue,
            platform_commission=parking_commission,
            partner_payouts=parking_payouts,
            total_bookings=parking_bookings,
            active_units=total_listings,
            contribution_percentage=parking_pct,
            avg_ticket_size=round(parking_revenue / parking_bookings, 2) if parking_bookings > 0 else 0.0,
            status="ACTIVE"
        ),
        ServiceClassificationOut(
            service_id="DRIVERS",
            service_name="Acting Drivers Fleet",
            short_name="Acting Drivers",
            category="On-Demand Chauffeurs",
            icon="",
            gross_collected=driver_revenue,
            platform_commission=driver_commission,
            partner_payouts=driver_payouts,
            total_bookings=driver_trips,
            active_units=total_drivers,
            contribution_percentage=driver_pct,
            avg_ticket_size=round(driver_revenue / driver_trips, 2) if driver_trips > 0 else 0.0,
            status="ACTIVE"
        ),
        ServiceClassificationOut(
            service_id="CAR_SPA",
            service_name="Car Spa & Detailing Hubs",
            short_name="Car Spa",
            category="Doorstep & In-Bay Detailing",
            icon="",
            gross_collected=spa_revenue,
            platform_commission=spa_commission,
            partner_payouts=spa_payouts,
            total_bookings=spa_orders,
            active_units=total_car_spas,
            contribution_percentage=spa_pct,
            avg_ticket_size=round(spa_revenue / spa_orders, 2) if spa_orders > 0 else 0.0,
            status="ACTIVE"
        )
    ]

    # 7. Classified Transactions Stream (Recent cross-service ledger)
    classified_transactions = []
    
    # Add driver transactions (paid / live / completed trips from the DB)
    driver_rows = db.query(ActingDriverBooking).filter(
        ActingDriverBooking.status.in_([
            DriverBookingStatusEnum.CONFIRMED.value,
            DriverBookingStatusEnum.TRIP_STARTED.value,
            DriverBookingStatusEnum.PAYMENT_DUE.value,
            DriverBookingStatusEnum.COMPLETED.value,
        ])
    ).order_by(ActingDriverBooking.created_at.desc()).limit(15).all()
    for d_book in driver_rows:
        gross = float(d_book.amount_paid or 0.0)
        commission = float(d_book.final_platform_fee if d_book.final_platform_fee is not None else d_book.estimated_platform_fee or 0.0)
        payout = float(d_book.driver_earning or (d_book.final_driver_fee if d_book.final_driver_fee is not None else d_book.estimated_driver_fee) or 0.0)
        classified_transactions.append(
            ClassifiedTransactionOut(
                id=d_book.booking_reference,
                service="DRIVERS",
                service_label="Acting Driver",
                service_icon="",
                booking_reference=d_book.booking_reference,
                customer_name=d_book.customer.full_name if d_book.customer else "Customer",
                gross_amount=round(gross, 2),
                commission=round(commission, 2),
                net_payout=round(payout, 2),
                status=d_book.status,
                date=d_book.created_at.isoformat() if d_book.created_at else "Recently",
                payment_method="UPI / Razorpay"
            )
        )

    # Add spa transactions (paid bookings)
    for s_book in CarSpaServiceApp.list_admin_bookings(db):
        if not s_book.paid_at and (s_book.amount_paid or 0) <= 0:
            continue
        gross = float(s_book.amount_paid or s_book.service_price or 0)
        classified_transactions.append(
            ClassifiedTransactionOut(
                id=s_book.booking_reference,
                service="CAR_SPA",
                service_label="Car Spa Detailing",
                service_icon="",
                booking_reference=s_book.booking_reference,
                customer_name=(s_book.customer.full_name if s_book.customer else None) or s_book.service_name,
                gross_amount=round(gross, 2),
                commission=round(gross * 0.10, 2),
                net_payout=round(gross * 0.90, 2),
                status=s_book.status,
                date=s_book.created_at.isoformat() if s_book.created_at else "Recently",
                payment_method="UPI / Razorpay"
            )
        )

    # Add parking payments from db if any
    for pay in db.query(Payment).limit(10).all():
        classified_transactions.append(
            ClassifiedTransactionOut(
                id=pay.order_id or f"PAY-{pay.id}",
                service="PARKING",
                service_label="Parking Radar",
                service_icon="",
                booking_reference=f"PRK-{pay.booking_id}",
                customer_name="Driveway Parker",
                gross_amount=pay.amount,
                commission=pay.platform_commission,
                net_payout=pay.host_gross_earning,
                status=pay.status.value if hasattr(pay.status, "value") else str(pay.status),
                date=pay.created_at.isoformat() if pay.created_at else "Recently",
                payment_method="Razorpay Gateway"
            )
        )

    return AdminStatsOut(
        total_users=total_users,
        total_hosts=total_hosts,
        total_listings=total_listings,
        pending_listings=pending_listings,
        total_bookings=total_bookings,
        active_bookings=active_bookings,
        total_revenue=total_revenue,
        platform_commission_earned=total_commission,
        total_payouts=total_payouts,
        total_drivers=total_drivers,
        total_car_spas=total_car_spas,
        services_classification=services_classification,
        classified_transactions=classified_transactions
    )

@router.get("/listings/pending", response_model=List[ListingOut])
def get_pending_listings(
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    listings = db.query(ParkingListing).filter(ParkingListing.status == ListingStatusEnum.PENDING_APPROVAL).all()
    return [ListingService.get_listing_by_id(db, l.id, current_user_id=current_user.id, is_confirmed_parker=True) for l in listings]

@router.get("/listings/all", response_model=List[ListingOut])
def get_all_listings_admin(
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    listings = db.query(ParkingListing).all()
    return [ListingService.get_listing_by_id(db, l.id, current_user_id=current_user.id, is_confirmed_parker=True) for l in listings]

@router.post("/listings/{listing_id}/approve", response_model=ListingOut)
def approve_or_reject_listing(
    listing_id: int,
    action: ListingApprovalAction,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    listing = db.query(ParkingListing).filter(ParkingListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    listing.status = action.status
    if action.rejection_reason:
        listing.rejection_reason = action.rejection_reason
    elif action.status == ListingStatusEnum.ACTIVE:
        listing.rejection_reason = None

    db.commit()
    db.refresh(listing)
    return ListingService.get_listing_by_id(db, listing.id, current_user_id=current_user.id, is_confirmed_parker=True)

def _directory_row(account, roles: list, account_name: str) -> dict:
    role_values = []
    for role in roles:
        role_values.append(role.value if hasattr(role, "value") else str(role))
    return {
        "id": account.id,
        "email": account.email,
        "full_name": account.full_name,
        "phone_number": account.phone_number,
        "is_active": account.is_active,
        "is_verified": account.is_verified,
        "roles": role_values,
        "account": account_name,
        "created_at": account.created_at.isoformat() if account.created_at else None,
    }


@router.get("/users")
def get_all_users_admin(
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    """Customers come from users, hosts from hosts, admins from admins."""
    wanted = (role or "").upper()
    needle = f"%{search}%" if search else None
    rows = []

    if wanted in ("", "PARKER"):
        query = db.query(User)
        if needle:
            query = query.filter((User.full_name.ilike(needle)) | (User.email.ilike(needle)))
        for user in query.all():
            roles = [r.role for r in user.roles] or [UserRoleEnum.PARKER]
            rows.append(_directory_row(user, roles, "customer"))

    if wanted in ("", "HOST"):
        query = db.query(Host)
        if needle:
            query = query.filter((Host.full_name.ilike(needle)) | (Host.email.ilike(needle)))
        for host in query.all():
            rows.append(_directory_row(host, [UserRoleEnum.HOST], "host"))

    if wanted in ("", "ADMIN"):
        query = db.query(Admin)
        if needle:
            query = query.filter((Admin.full_name.ilike(needle)) | (Admin.email.ilike(needle)))
        for admin in query.all():
            rows.append(_directory_row(admin, [UserRoleEnum.ADMIN], "admin"))

    rows.sort(key=lambda row: row["created_at"] or "", reverse=True)
    return rows

@router.post("/users/{user_id}/toggle-status")
def toggle_user_status_admin(
    user_id: int,
    account: str = "customer",
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    account = (account or "customer").lower()
    model = {"customer": User, "host": Host, "admin": Admin}.get(account)
    if model is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown account type")

    user = db.query(model).filter(model.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if account_kind(current_user) == account and user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot toggle status of yourself")

    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "email": user.email, "is_active": user.is_active, "account": account}

