import random
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.dispute import Dispute, DisputeStatusEnum, DisputeCategoryEnum
from app.models.booking import Booking
from app.schemas.dispute import DisputeCreate, DisputeResolve

class DisputeService:
    @staticmethod
    def create_dispute(db: Session, reporter_id: int, data: DisputeCreate) -> Dispute:
        booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        host_user_id = booking.listing.host.user_id if (booking.listing and booking.listing.host) else None

        if reporter_id == booking.user_id:
            reporter_role = "PARKER"
            reported_user_id = host_user_id or booking.user_id
        elif host_user_id and reporter_id == host_user_id:
            reporter_role = "HOST"
            reported_user_id = booking.user_id
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a party to this booking")

        dispute_ref = f"DSP-{random.randint(100000, 999999)}"
        dispute = Dispute(
            dispute_reference=dispute_ref,
            booking_id=booking.id,
            reporter_id=reporter_id,
            reported_user_id=reported_user_id,
            reporter_role=reporter_role,
            category=data.category,
            description=data.description.strip(),
            status=DisputeStatusEnum.OPEN
        )
        db.add(dispute)
        db.commit()
        db.refresh(dispute)
        return dispute

    @staticmethod
    def get_my_disputes(db: Session, user_id: int) -> List[dict]:
        disputes = db.query(Dispute).filter(
            (Dispute.reporter_id == user_id) | (Dispute.reported_user_id == user_id)
        ).order_by(Dispute.created_at.desc()).all()

        return [DisputeService.serialize_dispute(d) for d in disputes]

    @staticmethod
    def get_all_disputes(db: Session, status_filter: Optional[str] = None) -> List[dict]:
        query = db.query(Dispute)
        if status_filter:
            query = query.filter(Dispute.status == status_filter.upper())
        disputes = query.order_by(Dispute.created_at.desc()).all()
        return [DisputeService.serialize_dispute(d) for d in disputes]

    @staticmethod
    def resolve_dispute(db: Session, admin_id: int, dispute_id: int, data: DisputeResolve) -> dict:
        dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
        if not dispute:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute record not found")

        dispute.status = data.status
        dispute.resolution_notes = data.resolution_notes
        dispute.resolved_by_admin_id = admin_id
        dispute.resolved_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(dispute)
        return DisputeService.serialize_dispute(dispute)

    @staticmethod
    def serialize_dispute(d: Dispute) -> dict:
        return {
            "id": d.id,
            "dispute_reference": d.dispute_reference,
            "booking_id": d.booking_id,
            "reporter_id": d.reporter_id,
            "reported_user_id": d.reported_user_id,
            "reporter_role": d.reporter_role,
            "category": d.category,
            "description": d.description,
            "status": d.status,
            "resolution_notes": d.resolution_notes,
            "resolved_by_admin_id": d.resolved_by_admin_id,
            "resolved_at": d.resolved_at,
            "created_at": d.created_at,
            "reporter_name": d.reporter.full_name if d.reporter else "User",
            "reported_user_name": d.reported_user.full_name if d.reported_user else "User",
            "booking_reference": d.booking.booking_reference if d.booking else f"#{d.booking_id}",
            "listing_title": d.booking.listing.title if (d.booking and d.booking.listing) else "Parking Space"
        }
