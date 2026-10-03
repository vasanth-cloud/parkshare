import os
import re
import random
import uuid
import shutil
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, HostProfile, UserRole, UserRoleEnum
from app.dependencies.auth import get_current_user
from app.services.email_service import send_email_otp
from app.services.sms_service import send_mobile_sms_otp
from app.services.kyc_service import AutomatedKYCProvider
from app.schemas.verification import (
    SendMobileOtpRequest,
    VerifyMobileOtpRequest,
    SendEmailOtpRequest,
    VerifyEmailOtpRequest,
    HostIdentitySubmit,
    VerificationStatusOut,
)

router = APIRouter(prefix="/verification", tags=["Identity Verification"])

# Secure OTP cache with expiration: key -> {"otp": "123456", "expires_at": datetime}
_OTP_CACHE: Dict[str, Dict[str, Any]] = {}

def _generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return f"{random.randint(100000, 999999):06d}"

def _mask_id_number(id_num: str, id_type: str) -> str:
    cleaned = id_num.strip()
    if len(cleaned) <= 4:
        return cleaned
    return "X" * (len(cleaned) - 4) + cleaned[-4:]

@router.post("/upload-file")
async def upload_verification_file(
    file: UploadFile = File(...)
):
    """
    Uploads a live camera photo, device profile photo, or government ID document.
    Saves securely in settings.UPLOAD_DIR and returns the accessible URL.
    """
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    orig_name = file.filename or "upload.jpg"
    ext = os.path.splitext(orig_name)[1].lower()
    if not ext or ext not in allowed_exts:
        ext = ".jpg"

    unique_filename = f"kyc_{uuid.uuid4().hex[:12]}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    destination_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(destination_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "success": True,
        "filename": unique_filename,
        "url": f"/uploads/{unique_filename}"
    }

@router.post("/send-mobile-otp")
def send_mobile_otp_endpoint(data: SendMobileOtpRequest):
    phone = data.phone_number.strip()
    clean_digits = re.sub(r'\D', '', phone)
    if len(clean_digits) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid mobile number with at least 10 digits (e.g. +91 9876543210)"
        )

    # Generate real random 6-digit OTP
    otp = _generate_otp()
    _OTP_CACHE[f"phone:{phone}"] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }

    # Dispatch via SMS Gateway (Fast2SMS / Twilio / SMS Engine)
    sms_sent, status_message = send_mobile_sms_otp(phone, otp)
    has_real_gateway = bool(settings.FAST2SMS_API_KEY or (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN))

    if sms_sent:
        return {
            "status": "OTP_SENT",
            "gateway_configured": True,
            "sms_delivered": True,
            "message": f"6-digit verification code has been dispatched via real SMS to {phone}. Please check your phone SMS inbox.",
            "phone_number": phone
        }
    elif has_real_gateway:
        return {
            "status": "SMS_GATEWAY_NOTICE",
            "gateway_configured": True,
            "sms_delivered": False,
            "message": f"Verification code: {otp}",
            "dev_otp": otp,
            "phone_number": phone
        }
    else:
        return {
            "status": "SMS_SIMULATED",
            "gateway_configured": False,
            "sms_delivered": False,
            "message": f"Verification code: {otp}",
            "dev_otp": otp,
            "phone_number": phone
        }

@router.post("/verify-mobile-otp")
def verify_mobile_otp(
    data: VerifyMobileOtpRequest,
    db: Session = Depends(get_db)
):
    phone = data.phone_number.strip()
    cache_entry = _OTP_CACHE.get(f"phone:{phone}")
    
    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found for this phone number. Please click 'Send OTP' first."
        )

    if datetime.now(timezone.utc) > cache_entry["expires_at"]:
        _OTP_CACHE.pop(f"phone:{phone}", None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired. Please request a new OTP."
        )

    if data.otp.strip() != cache_entry["otp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect Mobile OTP. Please enter the 6-digit code received on your phone."
        )

    # Verified successfully: remove from cache
    _OTP_CACHE.pop(f"phone:{phone}", None)

    # Check if a user with this phone exists to update
    user = db.query(User).filter(User.phone_number == phone).first()
    if user:
        user.phone_verified = True
        db.commit()

    return {
        "success": True,
        "phone_verified": True,
        "phone_number": phone,
        "message": "Mobile number successfully verified via OTP"
    }

@router.post("/send-email-otp")
def send_email_otp_endpoint(data: SendEmailOtpRequest):
    email = data.email.strip().lower()
    
    # Generate real random 6-digit OTP
    otp = _generate_otp()
    _OTP_CACHE[f"email:{email}"] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }

    # Dispatch via Real SMTP Email Service
    email_sent, status_message = send_email_otp(email, otp)
    has_real_smtp = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)

    if email_sent:
        return {
            "status": "OTP_SENT",
            "smtp_configured": True,
            "email_delivered": True,
            "message": f"6-digit verification code has been sent via SMTP to {email}. Please check your inbox or spam folder.",
            "email": email
        }
    elif has_real_smtp:
        return {
            "status": "OTP_SENT",
            "smtp_configured": True,
            "email_delivered": False,
            "message": f"SMTP Notice: {status_message}. To proceed seamlessly during development, your verification OTP is {otp}.",
            "dev_otp": otp,
            "email": email
        }
    else:
        return {
            "status": "OTP_SENT",
            "smtp_configured": False,
            "email_delivered": False,
            "message": f"SMTP (Gmail App Password) is not configured in backend/.env. For real emails to land in your inbox, set SMTP_USER and SMTP_PASSWORD in .env. Dispatched to server console. Development OTP: {otp}",
            "dev_otp": otp,
            "email": email
        }

@router.post("/verify-email-otp")
def verify_email_otp(
    data: VerifyEmailOtpRequest,
    db: Session = Depends(get_db)
):
    email = data.email.strip().lower()
    cache_entry = _OTP_CACHE.get(f"email:{email}")

    if not cache_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found for this email. Please click 'Send OTP' first."
        )

    if datetime.now(timezone.utc) > cache_entry["expires_at"]:
        _OTP_CACHE.pop(f"email:{email}", None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired. Please request a new OTP."
        )

    if data.otp.strip() != cache_entry["otp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect Email OTP. Please check your inbox and enter the 6-digit code."
        )

    # Verified successfully: remove from cache
    _OTP_CACHE.pop(f"email:{email}", None)

    user = db.query(User).filter(User.email == email).first()
    if user:
        user.email_verified = True
        user.is_verified = True
        db.commit()

    return {
        "success": True,
        "email_verified": True,
        "email": email,
        "message": "Email address successfully verified via OTP"
    }

@router.post("/submit-identity", response_model=VerificationStatusOut)
def submit_host_identity(
    data: HostIdentitySubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate Legal Name
    legal_name = data.legal_name.strip()
    if len(legal_name) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full legal name must contain at least 2 characters")

    # 2. Validate Government ID Type (AADHAAR, PAN, DRIVING_LICENCE, PASSPORT)
    gov_id_type = data.gov_id_type.upper().strip()
    allowed_types = ["AADHAAR", "PAN", "DRIVING_LICENCE", "PASSPORT"]
    if gov_id_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Government ID type. Allowed options: {', '.join(allowed_types)}"
        )

    # 3. Validate Profile Photo
    photo_url = data.profile_photo_url.strip()
    if not photo_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile photo is mandatory for Host identity verification")

    # 4. Automated KYC Verification Provider
    # Uses AutomatedKYCProvider to verify Aadhaar, PAN, DL, or Passport
    # No manual inspection by administrators required!
    is_verified, kyc_result = AutomatedKYCProvider.verify_document(
        gov_id_type=gov_id_type,
        gov_id_number=data.gov_id_number,
        legal_name=legal_name,
        document_url=data.gov_id_document_url or photo_url,
        profile_photo_url=photo_url
    )

    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=kyc_result.get("error", "Automated KYC Verification failed. Please check document number format.")
        )

    # Fetch or create HostProfile
    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not host_profile:
        host_profile = HostProfile(user_id=current_user.id)
        db.add(host_profile)

    # Make sure user has HOST role
    if not any(r.role == UserRoleEnum.HOST for r in current_user.roles):
        db.add(UserRole(user_id=current_user.id, role=UserRoleEnum.HOST))

    # Update host profile & user models
    current_user.full_name = legal_name
    current_user.profile_photo_url = photo_url
    current_user.phone_verified = True
    current_user.email_verified = True
    current_user.is_verified = True

    id_number = data.gov_id_number.strip().replace(" ", "").replace("-", "").upper()
    host_profile.legal_name = legal_name
    host_profile.profile_photo_url = photo_url
    host_profile.gov_id_type = gov_id_type
    host_profile.gov_id_number = id_number
    host_profile.gov_id_document_url = data.gov_id_document_url or photo_url
    host_profile.id_verification_provider = kyc_result.get("provider", f"Automated e-KYC ({gov_id_type})")
    host_profile.id_verified_at = datetime.now(timezone.utc)
    host_profile.is_identity_verified = True

    db.commit()
    db.refresh(host_profile)
    db.refresh(current_user)

    return VerificationStatusOut(
        is_identity_verified=True,
        can_submit_space=True,
        legal_name=host_profile.legal_name,
        has_legal_name=True,
        email=current_user.email,
        email_verified=True,
        phone_number=current_user.phone_number,
        phone_verified=True,
        profile_photo_url=host_profile.profile_photo_url,
        has_profile_photo=True,
        gov_id_type=host_profile.gov_id_type,
        gov_id_number=_mask_id_number(host_profile.gov_id_number or "", host_profile.gov_id_type or ""),
        gov_id_document_url=host_profile.gov_id_document_url,
        has_gov_id=True,
        id_verification_provider=host_profile.id_verification_provider,
        id_verified_at=host_profile.id_verified_at,
        missing_requirements=[]
    )

@router.get("/status", response_model=VerificationStatusOut)
def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()

    has_legal_name = bool((host_profile and host_profile.legal_name) or (current_user.full_name and len(current_user.full_name) > 2))
    has_phone = bool(current_user.phone_number)
    phone_verified = bool(current_user.phone_verified or (host_profile and host_profile.is_identity_verified))
    email_verified = bool(current_user.email_verified or current_user.is_verified or (host_profile and host_profile.is_identity_verified))
    photo_url = (host_profile.profile_photo_url if host_profile else None) or current_user.profile_photo_url
    has_profile_photo = bool(photo_url)
    gov_id_type = host_profile.gov_id_type if host_profile else None
    gov_id_number = host_profile.gov_id_number if host_profile else None
    has_gov_id = bool(gov_id_type and gov_id_number)

    # Missing checklist calculation
    missing: list[str] = []
    if not has_legal_name:
        missing.append("Full Legal Name")
    if not (has_phone and phone_verified):
        missing.append("Mobile Number + OTP Verification")
    if not email_verified:
        missing.append("Email Verification")
    if not has_profile_photo:
        missing.append("Profile Photo (Live Camera or Upload)")
    if not has_gov_id:
        missing.append("Government ID Verification (Aadhaar / PAN / Driving Licence / Passport)")

    # Check if host identity is verified
    is_identity_verified = bool(host_profile and host_profile.is_identity_verified)
    can_submit_space = is_identity_verified or (len(missing) == 0)

    # Auto-synchronize is_identity_verified if all 5 requirements are met
    if can_submit_space and host_profile and not host_profile.is_identity_verified:
        host_profile.is_identity_verified = True
        host_profile.id_verified_at = datetime.now(timezone.utc)
        db.commit()
        is_identity_verified = True

    return VerificationStatusOut(
        is_identity_verified=is_identity_verified,
        can_submit_space=can_submit_space,
        legal_name=(host_profile.legal_name if host_profile else None) or current_user.full_name,
        has_legal_name=has_legal_name,
        email=current_user.email,
        email_verified=email_verified,
        phone_number=current_user.phone_number,
        phone_verified=phone_verified,
        profile_photo_url=photo_url,
        has_profile_photo=has_profile_photo,
        gov_id_type=gov_id_type,
        gov_id_number=_mask_id_number(gov_id_number, gov_id_type) if gov_id_number else None,
        gov_id_document_url=host_profile.gov_id_document_url if host_profile else None,
        has_gov_id=has_gov_id,
        id_verification_provider=host_profile.id_verification_provider if host_profile else None,
        id_verified_at=host_profile.id_verified_at if host_profile else None,
        missing_requirements=missing
    )
