from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query, status, HTTPException
from app.schemas.rentals import (
    RentalVehicleSchema,
    RentalBookingCreate,
    RentalBookingOut,
    RentalPartnerCreate,
    RentalApprovalAction,
    RentalOtpVerifyRequest,
    RentalTripCompleteRequest,
    RcVerifyRequest,
    RcVerifyResponse,
)
from app.services.rentals_service import RentalsService

router = APIRouter(prefix="/rentals", tags=["Self-Drive & Bike Rentals"])

@router.get("/available", response_model=List[RentalVehicleSchema])
def get_available_vehicles(
    type: Optional[str] = Query(None, description="Vehicle type: ALL, CAR, BIKE"),
    transmission: Optional[str] = Query(None, description="Transmission filter: ANY, AUTOMATIC, MANUAL"),
    city: Optional[str] = Query(None, description="City or area name"),
    lat: Optional[float] = Query(None, description="Customer latitude for distance calculation"),
    lng: Optional[float] = Query(None, description="Customer longitude for distance calculation"),
    query: Optional[str] = Query(None, description="Search query string")
):
    """
    List available self-drive cars, bikes & electric scooters, optionally sorted by distance.
    """
    return RentalsService.get_available_vehicles(
        vehicle_type=type,
        transmission=transmission,
        city=city,
        lat=lat,
        lng=lng,
        query=query
    )

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

class DoorDeliveryToggleRequest(BaseModel):
    doorDeliveryAvailable: bool

@router.patch("/{vehicle_id}/door-delivery", response_model=RentalVehicleSchema)
@router.post("/{vehicle_id}/door-delivery", response_model=RentalVehicleSchema)
def update_vehicle_door_delivery(vehicle_id: str, data: DoorDeliveryToggleRequest):
    try:
        return RentalsService.update_door_delivery(vehicle_id, data.doorDeliveryAvailable)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/book", response_model=RentalBookingOut, status_code=status.HTTP_201_CREATED)
def book_rental(data: RentalBookingCreate):
    """
    Reserve a self-drive car or bike with doorstep delivery or hub pickup.
    """
    try:
        return RentalsService.create_booking(data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/bookings", response_model=List[RentalBookingOut])
def get_rental_bookings(
    phone: Optional[str] = Query(None, description="Renter / customer phone number"),
    partner_phone: Optional[str] = Query(None, description="Host / partner phone number"),
    booking_id: Optional[str] = Query(None, description="Specific booking ID")
):
    """
    Get rental bookings filtered by customer phone or host phone.
    """
    return RentalsService.get_bookings(phone=phone, partner_phone=partner_phone, booking_id=booking_id)

@router.post("/bookings/{booking_id}/verify-otp", response_model=RentalBookingOut)
def verify_handover_otp(booking_id: str, data: RentalOtpVerifyRequest):
    """
    Host enters the 4-digit handover OTP from the renter upon physical arrival.
    Verifying starts the trip and rental timer!
    """
    try:
        return RentalsService.verify_handover_otp(booking_id, data.otp)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/bookings/{booking_id}/complete", response_model=RentalBookingOut)
def complete_rental_trip(booking_id: str, data: RentalTripCompleteRequest):
    """
    Host completes the rental trip upon vehicle return and odometer verification.
    """
    try:
        return RentalsService.complete_trip(booking_id, data.returnNotes, data.finalOdometer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/verify-rc", response_model=RcVerifyResponse)
async def verify_vehicle_rc(data: RcVerifyRequest):
    """
    Verify vehicle Registration Certificate (RC) number in real-time via Ministry of Road Transport and Highways (MoRTH / Parivahan) & Attestr API Suite.
    """
    return await RentalsService.verify_rc(data)
