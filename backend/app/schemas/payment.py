from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.payment import PaymentStatusEnum, PaymentProviderEnum

class PaymentOrderCreate(BaseModel):
    booking_id: int

class PaymentOrderOut(BaseModel):
    id: int
    booking_id: int
    order_id: str
    amount: float
    currency: str
    key_id: str
    mock_mode: bool

class PaymentVerifyRequest(BaseModel):
    booking_id: int
    order_id: str
    payment_id: str
    signature: str

class PaymentOut(BaseModel):
    id: int
    booking_id: int
    order_id: str
    payment_id: Optional[str] = None
    provider: PaymentProviderEnum
    amount: float
    status: PaymentStatusEnum
    host_gross_earning: float
    platform_commission: float
    created_at: datetime

    class Config:
        from_attributes = True
