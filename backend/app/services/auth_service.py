import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole, UserRoleEnum, HostProfile, Vehicle
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.schemas.user import UserRegister, UserLogin, Token, HostProfileCreate, VehicleCreate

def normalize_registration_number(plate: str) -> str:
    """Normalize vehicle plate number (e.g. 'TN 38 AB 1234' -> 'TN38AB1234')"""
    return re.sub(r'[^A-Za-z0-9]', '', plate).upper()

class AuthService:
    @staticmethod
    def register_user(db: Session, data: UserRegister) -> User:
        existing = db.query(User).filter(User.email == data.email.lower()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        is_host = (data.role == UserRoleEnum.HOST)
        is_verified = False
        if is_host and data.gov_id_type and data.gov_id_number and data.profile_photo_url:
            is_verified = True

        user = User(
            email=data.email.lower(),
            hashed_password=hash_password(data.password),
            full_name=data.legal_name or data.full_name,
            phone_number=data.phone_number,
            profile_photo_url=data.profile_photo_url,
            phone_verified=bool(data.phone_verified or is_verified),
            email_verified=bool(data.email_verified or is_verified),
            is_verified=bool(data.email_verified or is_verified)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Assign requested role + default PARKER role
        role = UserRole(user_id=user.id, role=data.role)
        db.add(role)
        if data.role != UserRoleEnum.PARKER:
            db.add(UserRole(user_id=user.id, role=UserRoleEnum.PARKER))

        # If registering as HOST, create host profile
        if is_host:
            host_profile = HostProfile(
                user_id=user.id,
                legal_name=data.legal_name or data.full_name,
                business_name=f"{data.legal_name or data.full_name} Spaces",
                payout_upi_id=data.payout_upi_id,
                profile_photo_url=data.profile_photo_url,
                gov_id_type=data.gov_id_type,
                gov_id_number=data.gov_id_number,
                gov_id_document_url=data.gov_id_document_url,
                is_identity_verified=is_verified,
                id_verified_at=datetime.now(timezone.utc) if is_verified else None,
                id_verification_provider="DigiLocker / Aadhaar e-KYC Sandbox" if is_verified else None
            )
            db.add(host_profile)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def login_user(db: Session, data: UserLogin) -> dict:
        user = db.query(User).filter(User.email == data.email.lower()).first()
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is suspended")

        roles = [r.role.value for r in user.roles]
        access_token = create_access_token(subject=user.id, roles=roles)
        refresh_token = create_refresh_token(subject=user.id)

        hp = user.host_profile

        user_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "profile_photo_url": user.profile_photo_url or (hp.profile_photo_url if hp else None),
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "phone_verified": user.phone_verified or (hp.is_identity_verified if hp else False),
            "email_verified": user.email_verified or (hp.is_identity_verified if hp else False),
            "is_identity_verified": hp.is_identity_verified if hp else False,
            "roles": [r.role for r in user.roles],
            "created_at": user.created_at
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        }

    @staticmethod
    def become_host(db: Session, user: User, data: HostProfileCreate) -> HostProfile:
        existing_profile = db.query(HostProfile).filter(HostProfile.user_id == user.id).first()
        if existing_profile:
            return existing_profile

        # Add HOST role if not present
        has_host_role = any(r.role == UserRoleEnum.HOST for r in user.roles)
        if not has_host_role:
            db.add(UserRole(user_id=user.id, role=UserRoleEnum.HOST))

        profile = HostProfile(
            user_id=user.id,
            business_name=data.business_name,
            bio=data.bio,
            payout_bank_account=data.payout_bank_account,
            payout_ifsc=data.payout_ifsc,
            payout_upi_id=data.payout_upi_id
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def add_vehicle(db: Session, user_id: int, data: VehicleCreate) -> Vehicle:
        normalized_plate = normalize_registration_number(data.registration_number)
        
        if data.is_default:
            # Clear existing default flags
            db.query(Vehicle).filter(Vehicle.user_id == user_id).update({"is_default": False})

        vehicle = Vehicle(
            user_id=user_id,
            registration_number=normalized_plate,
            vehicle_type=data.vehicle_type,
            make=data.make,
            model=data.model,
            color=data.color,
            is_default=data.is_default
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
        return vehicle
