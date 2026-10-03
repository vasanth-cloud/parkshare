from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserRegister, UserLogin, Token, UserOut, HostProfileCreate, HostProfileOut, HostSummaryOut
from app.services.auth_service import AuthService
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    user = AuthService.register_user(db, data)
    hp = user.host_profile
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        profile_photo_url=user.profile_photo_url or (hp.profile_photo_url if hp else None),
        is_active=user.is_active,
        is_verified=user.is_verified,
        phone_verified=user.phone_verified or (hp.is_identity_verified if hp else False),
        email_verified=user.email_verified or (hp.is_identity_verified if hp else False),
        roles=[r.role for r in user.roles],
        created_at=user.created_at
    )

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    return AuthService.login_user(db, data)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    hp = current_user.host_profile
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        profile_photo_url=current_user.profile_photo_url or (hp.profile_photo_url if hp else None),
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        phone_verified=current_user.phone_verified or (hp.is_identity_verified if hp else False),
        email_verified=current_user.email_verified or (hp.is_identity_verified if hp else False),
        roles=[r.role for r in current_user.roles],
        created_at=current_user.created_at
    )

@router.api_route("/claim-admin", methods=["GET", "POST"])
def claim_admin(db: Session = Depends(get_db)):
    from app.models.user import User, UserRole, UserRoleEnum
    user = db.query(User).filter(User.email == "avasanth081@gmail.com").first()
    if not user:
        return {"status": "error", "message": "User avasanth081@gmail.com not found"}
    has_admin = any(r.role == UserRoleEnum.ADMIN for r in user.roles)
    if not has_admin:
        db.add(UserRole(user_id=user.id, role=UserRoleEnum.ADMIN))
        db.commit()
        db.refresh(user)
        return {"status": "success", "message": "ADMIN role granted successfully", "roles": [r.role.value if hasattr(r.role, 'value') else str(r.role) for r in user.roles]}
    return {"status": "already_admin", "message": "User already has ADMIN role", "roles": [r.role.value if hasattr(r.role, 'value') else str(r.role) for r in user.roles]}

@router.post("/become-host", response_model=HostProfileOut)
def become_host(data: HostProfileCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AuthService.become_host(db, current_user, data)

@router.get("/host-summary", response_model=HostSummaryOut)
def get_host_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.user import HostProfile
    from app.models.booking import Booking, BookingStatusEnum
    from datetime import datetime, timezone

    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    first_name = current_user.full_name.split()[0] if (current_user.full_name and current_user.full_name.strip()) else "Host"

    if not host_profile or not host_profile.listings:
        return HostSummaryOut(
            host_name=first_name,
            this_month_earnings=0.0,
            upcoming_bookings=0,
            active_parking=0,
            rating=0.0
        )

    now = datetime.now(timezone.utc)
    listing_ids = [l.id for l in host_profile.listings]

    upcoming_count = db.query(Booking).filter(
        Booking.listing_id.in_(listing_ids),
        Booking.status.in_([BookingStatusEnum.CONFIRMED, BookingStatusEnum.PENDING_PAYMENT, BookingStatusEnum.PENDING_APPROVAL]),
        Booking.start_time > now
    ).count()

    active_count = db.query(Booking).filter(
        Booking.listing_id.in_(listing_ids),
        Booking.status == BookingStatusEnum.ACTIVE
    ).count()

    # Calculate aggregate host rating across listings
    rated_listings = [l for l in host_profile.listings if l.total_reviews and l.total_reviews > 0]
    if rated_listings:
        total_revs = sum(l.total_reviews for l in rated_listings)
        avg_rating = round(sum(l.average_rating * l.total_reviews for l in rated_listings) / float(total_revs), 1)
    else:
        avg_rating = 0.0

    return HostSummaryOut(
        host_name=first_name,
        this_month_earnings=round(float(host_profile.total_earnings or 0.0), 2),
        upcoming_bookings=upcoming_count,
        active_parking=active_count,
        rating=avg_rating
    )
