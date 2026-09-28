from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.schemas.admin import AdminStatsOut, ListingApprovalAction
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
    total_bookings = db.query(Booking).count()
    active_bookings = db.query(Booking).filter(Booking.status == BookingStatusEnum.ACTIVE).count()

    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatusEnum.PAID).scalar() or 0.0
    platform_commission = db.query(func.sum(Payment.platform_commission)).filter(Payment.status == PaymentStatusEnum.PAID).scalar() or 0.0
    total_payouts = db.query(func.sum(Payment.host_gross_earning)).filter(Payment.status == PaymentStatusEnum.PAID).scalar() or 0.0

    return AdminStatsOut(
        total_users=total_users,
        total_hosts=total_hosts,
        total_listings=total_listings,
        pending_listings=pending_listings,
        total_bookings=total_bookings,
        active_bookings=active_bookings,
        total_revenue=total_revenue,
        platform_commission_earned=platform_commission,
        total_payouts=total_payouts
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

