from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    booking_id: int
    user_id: int
    listing_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ComplaintCreate(BaseModel):
    listing_id: Optional[int] = None
    booking_id: Optional[int] = None
    subject: str
    description: str

class ComplaintOut(BaseModel):
    id: int
    user_id: int
    subject: str
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
