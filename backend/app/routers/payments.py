from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.payment import PaymentOrderCreate, PaymentOrderOut, PaymentVerifyRequest, PaymentOut
from app.services.payment_service import PaymentService
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-order", response_model=PaymentOrderOut)
def create_order(
    data: PaymentOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return PaymentService.create_payment_order(db, data.booking_id, current_user.id)

@router.post("/verify", response_model=PaymentOut)
def verify_payment(
    data: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return PaymentService.verify_payment(
        db,
        booking_id=data.booking_id,
        user_id=current_user.id,
        order_id=data.order_id,
        payment_id=data.payment_id,
        signature=data.signature
    )
