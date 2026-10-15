from typing import List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from app.schemas.rentals import (
    RentalVehicleSchema,
    RentalBookingCreate,
    RentalBookingOut,
    RentalPartnerCreate,
    RentalApprovalAction,
    RcVerifyRequest,
    RcVerifyResponse,
)
from app.services.rentals_service import RentalsService

router = APIRouter(prefix="/rentals", tags=["Self-Drive & Bike Rentals"])

@router.get("/available", response_model=List[RentalVehicleSchema])
def get_available_vehicles(
    type: Optional[str] = Query(None, description="Vehicle type: ALL, CAR, BIKE"),
    transmission: Optional[str] = Query(None, description="Transmission filter: ANY, AUTOMATIC, MANUAL"),
    city: Optional[str] = Query(None, description="City or area name")
):
    """
    List available self-drive cars, bikes & electric scooters.
    """
    return RentalsService.get_available_vehicles(vehicle_type=type, transmission=transmission, city=city)

@router.get("/all", response_model=List[RentalVehicleSchema])
def get_all_vehicles(
    status: Optional[str] = Query(None, description="Status filter: ALL, ACTIVE, PENDING_APPROVAL, SUSPENDED"),
    city: Optional[str] = Query(None, description="City name")
):
    """
    List all rental vehicles registered across partners (Admin & Directory).
    """
    return RentalsService.get_all_vehicles(status=status, city=city)

@router.post("/register", response_model=RentalVehicleSchema, status_code=status.HTTP_201_CREATED)
def register_rental_partner(data: RentalPartnerCreate):
    """
    Register a vehicle or fleet for Self-Drive Rental on ParkCo Partner app.
    """
    return RentalsService.register_partner(data)

@router.post("/{vehicle_id}/status", response_model=RentalVehicleSchema)
def update_vehicle_status(vehicle_id: str, action: RentalApprovalAction):
    """
    Approve, suspend, or reject a rental vehicle listing.
    """
    try:
        return RentalsService.update_status(vehicle_id, action.status, action.reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/book", response_model=RentalBookingOut, status_code=status.HTTP_201_CREATED)
def book_rental(data: RentalBookingCreate):
    """
    Reserve a self-drive car or bike with doorstep delivery or hub pickup.
    """
    return RentalsService.create_booking(data)

@router.post("/verify-rc", response_model=RcVerifyResponse)
async def verify_vehicle_rc(data: RcVerifyRequest):
    """
    Verify vehicle Registration Certificate (RC) number in real-time via Ministry of Road Transport and Highways (MoRTH / Parivahan) & Attestr API Suite.
    """
    return await RentalsService.verify_rc(data)

