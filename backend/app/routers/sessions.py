from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.booking import SessionVerifyRequest, SessionOut
from app.services.session_service import SessionService
from app.dependencies.auth import require_role
from app.models.user import User, UserRoleEnum

router = APIRouter(prefix="/parking-sessions", tags=["Parking Sessions"])

@router.post("/check-in", response_model=SessionOut)
def check_in(
    data: SessionVerifyRequest,
    current_user: User = Depends(require_role(UserRoleEnum.HOST)),
    db: Session = Depends(get_db)
):
    return SessionService.check_in(
        db,
        host_user_id=current_user.id,
        qr_token=data.qr_token,
        booking_reference=data.booking_reference,
        verification_code=data.verification_code
    )

@router.post("/check-out/{booking_id}", response_model=SessionOut)
def check_out(
    booking_id: int,
    current_user: User = Depends(require_role(UserRoleEnum.HOST)),
    db: Session = Depends(get_db)
):
    return SessionService.check_out(db, current_user.id, booking_id)
