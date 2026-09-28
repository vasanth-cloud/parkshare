from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.dispute import DisputeStatusEnum, DisputeCategoryEnum

class DisputeCreate(BaseModel):
    booking_id: int
    category: DisputeCategoryEnum
    description: str

class DisputeResolve(BaseModel):
    status: DisputeStatusEnum
    resolution_notes: str

class DisputeOut(BaseModel):
    id: int
    dispute_reference: str
    booking_id: int
    reporter_id: int
    reported_user_id: int
    reporter_role: str
    category: DisputeCategoryEnum
    description: str
    status: DisputeStatusEnum
    resolution_notes: Optional[str] = None
    resolved_by_admin_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    reporter_name: Optional[str] = None
    reported_user_name: Optional[str] = None
    booking_reference: Optional[str] = None
    listing_title: Optional[str] = None

    class Config:
        from_attributes = True
