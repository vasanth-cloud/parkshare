from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.dispute import DisputeCreate, DisputeResolve, DisputeOut
from app.services.dispute_service import DisputeService
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRoleEnum

router = APIRouter(tags=["Disputes & Reports"])

@router.post("/disputes", response_model=DisputeOut, status_code=status.HTTP_201_CREATED)
def create_dispute(
    data: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DisputeService.create_dispute(db, current_user.id, data)

@router.get("/disputes/my", response_model=List[DisputeOut])
def get_my_disputes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DisputeService.get_my_disputes(db, current_user.id)

@router.get("/admin/disputes", response_model=List[DisputeOut])
def list_admin_disputes(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return DisputeService.get_all_disputes(db, status_filter=status)

@router.post("/admin/disputes/{dispute_id}/resolve", response_model=DisputeOut)
def resolve_admin_dispute(
    dispute_id: int,
    data: DisputeResolve,
    current_user: User = Depends(require_role(UserRoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    return DisputeService.resolve_dispute(db, current_user.id, dispute_id, data)
