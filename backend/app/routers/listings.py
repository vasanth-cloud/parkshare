from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.listing import ListingCreate, ListingOut
from app.services.listing_service import ListingService
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRoleEnum, HostProfile
from app.models.listing import ParkingListing, ListingStatusEnum

router = APIRouter(prefix="/listings", tags=["Listings"])

@router.get("/search", response_model=List[ListingOut])
def search_listings(
    city: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: float = Query(10.0),
    vehicle_type: Optional[str] = Query(None),
    max_hourly_price: Optional[float] = Query(None),
    is_covered: Optional[bool] = Query(None),
    has_ev_charging: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    return ListingService.search_listings(
        db, city, area, lat, lng, radius_km, vehicle_type, max_hourly_price, is_covered, has_ev_charging
    )

@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    data: ListingCreate,
    current_user: User = Depends(require_role(UserRoleEnum.HOST)),
    db: Session = Depends(get_db)
):
    return ListingService.create_listing(db, current_user.id, data)

@router.get("/my-listings", response_model=List[ListingOut])
def get_my_listings(
    current_user: User = Depends(require_role(UserRoleEnum.HOST)),
    db: Session = Depends(get_db)
):
    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    if not host_profile:
        return []
    listings = db.query(ParkingListing).filter(ParkingListing.host_profile_id == host_profile.id).all()
    
    output = []
    for l in listings:
        item = ListingService.get_listing_by_id(db, l.id, current_user_id=current_user.id)
        output.append(item)
    return output

@router.get("/{listing_id}", response_model=ListingOut)
def get_listing_detail(
    listing_id: int,
    db: Session = Depends(get_db)
):
    return ListingService.get_listing_by_id(db, listing_id)

@router.post("/{listing_id}/toggle-status", response_model=ListingOut)
def toggle_listing_status(
    listing_id: int,
    current_user: User = Depends(require_role(UserRoleEnum.HOST)),
    db: Session = Depends(get_db)
):
    host_profile = db.query(HostProfile).filter(HostProfile.user_id == current_user.id).first()
    listing = db.query(ParkingListing).filter(ParkingListing.id == listing_id, ParkingListing.host_profile_id == host_profile.id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
        
    if listing.status == ListingStatusEnum.ACTIVE:
        listing.status = ListingStatusEnum.PAUSED
    elif listing.status == ListingStatusEnum.PAUSED:
        listing.status = ListingStatusEnum.ACTIVE
    db.commit()
    db.refresh(listing)
    return ListingService.get_listing_by_id(db, listing.id, current_user_id=current_user.id)
