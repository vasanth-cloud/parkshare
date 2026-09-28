from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.review import ReviewCreate, ReviewOut, ComplaintCreate, ComplaintOut
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatusEnum
from app.models.engagement import Review, Favorite, Complaint
from app.models.listing import ParkingListing

router = APIRouter(prefix="/reviews", tags=["Reviews & Favorites"])

@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == data.booking_id, Booking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status != BookingStatusEnum.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only review completed bookings")

    existing = db.query(Review).filter(Review.booking_id == booking.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review already submitted for this booking")

    review = Review(
        booking_id=booking.id,
        user_id=current_user.id,
        listing_id=booking.listing_id,
        rating=data.rating,
        comment=data.comment
    )
    db.add(review)

    # Recalculate listing average rating
    listing = db.query(ParkingListing).filter(ParkingListing.id == booking.listing_id).first()
    if listing:
        all_reviews = db.query(Review).filter(Review.listing_id == listing.id).all()
        ratings = [r.rating for r in all_reviews] + [data.rating]
        listing.total_reviews = len(ratings)
        listing.average_rating = round(sum(ratings) / float(len(ratings)), 1)

    db.commit()
    db.refresh(review)
    return review

@router.get("/listing/{listing_id}", response_model=List[ReviewOut])
def get_listing_reviews(listing_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.listing_id == listing_id).order_by(Review.created_at.desc()).all()

@router.post("/favorites/{listing_id}", status_code=status.HTTP_201_CREATED)
def toggle_favorite(listing_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.listing_id == listing_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"favorited": False}
    else:
        fav = Favorite(user_id=current_user.id, listing_id=listing_id)
        db.add(fav)
        db.commit()
        return {"favorited": True}

@router.post("/complaints", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(data: ComplaintCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    complaint = Complaint(
        user_id=current_user.id,
        listing_id=data.listing_id,
        booking_id=data.booking_id,
        subject=data.subject,
        description=data.description
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint
