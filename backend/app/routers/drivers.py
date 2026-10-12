from typing import List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from app.schemas.driver import (
    DriverProfileSchema,
    DriverBookingCreate,
    DriverBookingOut,
    DriverRegistrationCreate,
    DriverApprovalAction,
)
from app.services.driver_service import DriverService

router = APIRouter(prefix="/drivers", tags=["Acting Drivers"])

@router.get("/available", response_model=List[DriverProfileSchema])
def get_available_drivers(
    city: Optional[str] = Query(None, description="City name"),
    transmission: Optional[str] = Query(None, description="Transmission filter: ANY, MANUAL, AUTOMATIC")
):
    """
    List available acting drivers / chauffeurs.
    """
    return DriverService.get_available_drivers(city=city, transmission=transmission)

@router.get("/all", response_model=List[DriverProfileSchema])
def get_all_drivers(
    status: Optional[str] = Query(None, description="Status filter: ALL, ACTIVE, PENDING_APPROVAL, SUSPENDED"),
    city: Optional[str] = Query(None, description="City name")
):
    """
    List all registered driver partners (Admin & Directory).
    """
    return DriverService.get_all_drivers(status=status, city=city)

@router.post("/register", response_model=DriverProfileSchema, status_code=status.HTTP_201_CREATED)
def register_driver(data: DriverRegistrationCreate):
    """
    Register as an Acting Driver / Chauffeur Partner from Host or Admin panel.
    """
    return DriverService.register_driver(data)

@router.post("/{driver_id}/status", response_model=DriverProfileSchema)
def update_driver_status(driver_id: str, action: DriverApprovalAction):
    """
    Update driver partner status (Approve, Suspend, Reject).
    """
    try:
        return DriverService.update_driver_status(driver_id, action.status, action.reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/book", response_model=DriverBookingOut, status_code=status.HTTP_201_CREATED)
def book_driver(data: DriverBookingCreate):
    """
    Book an acting driver on demand.
    """
    return DriverService.create_booking(data)
