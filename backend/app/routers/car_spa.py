from typing import List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from app.schemas.car_spa import (
    SpaPackageSchema,
    SpaBookingCreate,
    SpaBookingOut,
    CarSpaCenterSchema,
    CarSpaRegistrationCreate,
    CarSpaApprovalAction,
)
from app.services.car_spa_service import CarSpaService

router = APIRouter(prefix="/car-spa", tags=["Car Spa & Detailing"])

@router.get("/packages", response_model=List[SpaPackageSchema])
def get_packages():
    """
    Get all car spa and detailing packages.
    """
    return CarSpaService.get_packages()

@router.get("/all", response_model=List[CarSpaCenterSchema])
def get_all_spas(
    status: Optional[str] = Query(None, description="Status filter: ALL, ACTIVE, PENDING_APPROVAL, SUSPENDED"),
    city: Optional[str] = Query(None, description="City name")
):
    """
    List registered car spa and detailing partner centers (Admin & Directory).
    """
    return CarSpaService.get_all_spas(status=status, city=city)

@router.post("/register", response_model=CarSpaCenterSchema, status_code=status.HTTP_201_CREATED)
def register_spa(data: CarSpaRegistrationCreate):
    """
    Register as a Car Spa / Detailing Center Partner from Host or Admin panel.
    """
    return CarSpaService.register_spa(data)

@router.post("/{spa_id}/status", response_model=CarSpaCenterSchema)
def update_spa_status(spa_id: str, action: CarSpaApprovalAction):
    """
    Update car spa partner status (Approve, Suspend, Reject).
    """
    try:
        return CarSpaService.update_spa_status(spa_id, action.status, action.reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/book", response_model=SpaBookingOut, status_code=status.HTTP_201_CREATED)
def book_spa(data: SpaBookingCreate):
    """
    Book a doorstep or parking bay car spa appointment.
    """
    return CarSpaService.create_booking(data)
