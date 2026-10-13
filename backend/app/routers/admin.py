from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.schemas.admin import AdminStatsOut, ListingApprovalAction, ServiceClassificationOut, ClassifiedTransactionOut
from app.schemas.listing import ListingOut
from app.services.listing_service import ListingService
from app.dependencies.auth import require_role
from app.models.user import User, UserRoleEnum, HostProfile
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
    total_hosts = db.query(HostProfile).count()
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

    # 2. Acting Drivers Service Financials
    from app.services.driver_service import DriverService
    total_drivers = len(DriverService.get_all_drivers())
    driver_revenue = float(DriverService.get_total_revenue())
    driver_trips = DriverService.get_total_trips()
    driver_commission = round(driver_revenue * 0.10, 2)
    driver_payouts = round(driver_revenue * 0.90, 2)

    # 3. Car Spa & Detailing Service Financials
    from app.services.car_spa_service import CarSpaService
    total_car_spas = len(CarSpaService.get_all_spas())
    spa_revenue = float(CarSpaService.get_total_revenue())
    spa_orders = CarSpaService.get_total_bookings()
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
            icon="🅿️",
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
            icon="🧑‍✈️",
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
            icon="✨",
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
    
    # Add driver transactions
    for d_book in DriverService.get_all_bookings():
        classified_transactions.append(
            ClassifiedTransactionOut(
                id=d_book.bookingId,
                service="DRIVERS",
                service_label="Acting Driver",
                service_icon="🧑‍✈️",
                booking_reference=d_book.bookingId,
                customer_name=d_book.pickupLocation.split(",")[0] if d_book.pickupLocation else "Customer",
                gross_amount=d_book.totalFare,
                commission=round(d_book.totalFare * 0.10, 2),
                net_payout=round(d_book.totalFare * 0.90, 2),
                status="COMPLETED",
                date=d_book.createdAt or "Recently",
                payment_method="UPI / Razorpay"
            )
        )

    # Add spa transactions
    for s_book in CarSpaService.get_all_bookings():
        classified_transactions.append(
            ClassifiedTransactionOut(
                id=s_book.bookingId,
                service="CAR_SPA",
                service_label="Car Spa Detailing",
                service_icon="✨",
                booking_reference=s_book.bookingId,
                customer_name=s_book.package.name if s_book.package else "Spa Service",
                gross_amount=s_book.finalPrice,
                commission=round(s_book.finalPrice * 0.10, 2),
                net_payout=round(s_book.finalPrice * 0.90, 2),
                status="COMPLETED",
                date=s_book.createdAt or "Recently",
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
                service_icon="🅿️",
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

@router.get("/users")
def get_all_users_admin(
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.roles.any(role))
    if search:
        query = query.filter((User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    
    users = query.all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "phone_number": u.phone_number,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "roles": [r.value if hasattr(r, 'value') else str(r) for r in u.roles],
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@router.post("/users/{user_id}/toggle-status")
def toggle_user_status_admin(
    user_id: int,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot toggle status of yourself")

    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "email": user.email, "is_active": user.is_active}

