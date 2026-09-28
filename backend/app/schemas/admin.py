from pydantic import BaseModel
from typing import Optional, List
from app.models.listing import ListingStatusEnum

class ListingApprovalAction(BaseModel):
    status: ListingStatusEnum  # ACTIVE or REJECTED
    rejection_reason: Optional[str] = None

class AdminStatsOut(BaseModel):
    total_users: int
    total_hosts: int
    total_listings: int
    pending_listings: int
    total_bookings: int
    active_bookings: int
    total_revenue: float
    platform_commission_earned: float
    total_payouts: float

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
