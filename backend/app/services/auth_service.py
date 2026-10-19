import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole, UserRoleEnum, HostProfile, Vehicle
from app.models.account import Host, Admin
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.schemas.user import UserRegister, UserLogin, HostProfileCreate, VehicleCreate

def normalize_registration_number(plate: str) -> str:
    """Normalize vehicle plate number (e.g. 'TN 38 AB 1234' -> 'TN38AB1234')"""
    return re.sub(r'[^A-Za-z0-9]', '', plate).upper()

def _portal_for_register(data: UserRegister) -> str:
    portal = (getattr(data, "portal", None) or "").lower().strip()
    if portal in ("customer", "host", "admin"):
        return portal
    if data.role == UserRoleEnum.HOST:
        return "host"
    if data.role == UserRoleEnum.ADMIN:
        return "admin"
    return "customer"


def _role_values(account, portal: str) -> list:
    if portal == "host":
        return [UserRoleEnum.HOST]
    if portal == "admin":
        return [UserRoleEnum.ADMIN]
    values = []
    for r in account.roles:
        val = r.role.value if hasattr(r.role, "value") else r.role
        if val == UserRoleEnum.PARKER or str(val) == "PARKER":
            values.append(UserRoleEnum.PARKER)
    return values or [UserRoleEnum.PARKER]


def _public_user(account, portal: str) -> dict:
    hp = account.host_profile if portal == "host" else None
    return {
        "id": account.id,
        "email": account.email,
        "full_name": account.full_name,
        "phone_number": account.phone_number,
        "profile_photo_url": account.profile_photo_url or (hp.profile_photo_url if hp else None),
        "is_active": account.is_active,
        "is_verified": bool(account.is_verified),
        "phone_verified": bool(account.phone_verified or (hp.is_identity_verified if hp else False)),
        "email_verified": bool(account.email_verified or (hp.is_identity_verified if hp else False)),
        "is_identity_verified": bool(hp.is_identity_verified) if hp else False,
        "roles": _role_values(account, portal),
        "created_at": account.created_at,
    }


class AuthService:
    @staticmethod
    def register_user(db: Session, data: UserRegister):
        portal = _portal_for_register(data)
        if portal == "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin accounts are created by the platform")

        email = data.email.lower()
        if portal == "host":
            if db.query(Host).filter(Host.email == email).first():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            return AuthService._register_host(db, data, email)

        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user = User(
            email=email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            phone_number=data.phone_number,
            profile_photo_url=data.profile_photo_url,
            phone_verified=bool(data.phone_verified),
            email_verified=bool(data.email_verified),
            is_verified=bool(data.email_verified),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(UserRole(user_id=user.id, role=UserRoleEnum.PARKER))
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def _register_host(db: Session, data: UserRegister, email: str) -> Host:
        is_verified = bool(data.gov_id_type and data.gov_id_number and data.profile_photo_url)
        host = Host(
            email=email,
            hashed_password=hash_password(data.password),
            full_name=data.legal_name or data.full_name,
            phone_number=data.phone_number,
            profile_photo_url=data.profile_photo_url,
            phone_verified=bool(data.phone_verified or is_verified),
            email_verified=bool(data.email_verified or is_verified),
            is_verified=bool(data.email_verified or is_verified),
        )
        db.add(host)
        db.commit()
        db.refresh(host)

        db.add(HostProfile(
            user_id=host.id,
            legal_name=data.legal_name or data.full_name,
            business_name=f"{data.legal_name or data.full_name} Spaces",
            payout_upi_id=data.payout_upi_id,
            profile_photo_url=data.profile_photo_url,
            gov_id_type=data.gov_id_type,
            gov_id_number=data.gov_id_number,
            gov_id_document_url=data.gov_id_document_url,
            is_identity_verified=is_verified,
            id_verified_at=datetime.now(timezone.utc) if is_verified else None,
            id_verification_provider="DigiLocker / Aadhaar e-KYC Sandbox" if is_verified else None,
        ))
        db.commit()
        db.refresh(host)
        return host

    @staticmethod
    def _account_by_portal(db: Session, portal: str, email: str):
        if portal == "host":
            return db.query(Host).filter(Host.email == email).first(), "host"
        if portal == "admin":
            return db.query(Admin).filter(Admin.email == email).first(), "admin"
        if portal == "customer":
            return db.query(User).filter(User.email == email).first(), "customer"
        return None, None

    @staticmethod
    def login_user(db: Session, data: UserLogin) -> dict:
        email = data.email.lower()
        portal = (data.portal or "").lower().strip()
        if portal in ("customer", "host", "admin"):
            account, portal = AuthService._account_by_portal(db, portal, email)
            if not account or not verify_password(data.password, account.hashed_password):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        else:
            # Older clients that omit portal. Apps always send a portal.
            matches = []
            for candidate in ("customer", "host", "admin"):
                row, kind = AuthService._account_by_portal(db, candidate, email)
                if row and verify_password(data.password, row.hashed_password):
                    matches.append((row, kind))
            if len(matches) != 1:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
            account, portal = matches[0]

        if not account.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is suspended")

        roles = [r.value if hasattr(r, "value") else str(r) for r in _role_values(account, portal)]
        access_token = create_access_token(subject=account.id, roles=roles, portal=portal)
        refresh_token = create_refresh_token(subject=account.id, portal=portal)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": _public_user(account, portal),
        }

    @staticmethod
    def become_host(db: Session, user, data: HostProfileCreate) -> HostProfile:
        if isinstance(user, Host):
            existing_profile = db.query(HostProfile).filter(HostProfile.user_id == user.id).first()
            if existing_profile:
                return existing_profile
            host = user
        else:
            host = db.query(Host).filter(Host.email == user.email.lower()).first()
            if host:
                existing_profile = db.query(HostProfile).filter(HostProfile.user_id == host.id).first()
                if existing_profile:
                    return existing_profile
            else:
                host = Host(
                    email=user.email.lower(),
                    hashed_password=user.hashed_password,
                    full_name=user.full_name,
                    phone_number=user.phone_number,
                    profile_photo_url=user.profile_photo_url,
                    is_active=user.is_active,
                    is_verified=user.is_verified,
                    phone_verified=bool(user.phone_verified),
                    email_verified=bool(user.email_verified),
                )
                db.add(host)
                db.flush()

        profile = HostProfile(
            user_id=host.id,
            business_name=data.business_name,
            bio=data.bio,
            payout_bank_account=data.payout_bank_account,
            payout_ifsc=data.payout_ifsc,
            payout_upi_id=data.payout_upi_id,
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
