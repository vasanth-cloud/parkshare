from pydantic import BaseModel
from typing import Optional, List
from app.models.listing import ListingStatusEnum

class ListingApprovalAction(BaseModel):
    status: ListingStatusEnum  # ACTIVE or REJECTED
    rejection_reason: Optional[str] = None

class ServiceClassificationOut(BaseModel):
    service_id: str
    service_name: str
    short_name: str
    category: str
    icon: str
    gross_collected: float
    platform_commission: float
    partner_payouts: float
    total_bookings: int
    active_units: int
    contribution_percentage: float
    avg_ticket_size: float
    status: str = "ACTIVE"

class ClassifiedTransactionOut(BaseModel):
    id: str
    service: str
    service_label: str
    service_icon: str
    booking_reference: str
    customer_name: str
    gross_amount: float
    commission: float
    net_payout: float
    status: str
    date: str
    payment_method: str

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
    total_drivers: int = 0
    total_car_spas: int = 0
    services_classification: Optional[List[ServiceClassificationOut]] = None
    classified_transactions: Optional[List[ClassifiedTransactionOut]] = None

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
