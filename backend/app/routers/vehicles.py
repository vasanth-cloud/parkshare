from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import VehicleCreate, VehicleOut
from app.services.auth_service import AuthService
from app.dependencies.auth import get_current_user
from app.models.user import User, Vehicle

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def add_vehicle(data: VehicleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AuthService.add_vehicle(db, current_user.id, data)

@router.get("", response_model=List[VehicleOut])
def list_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    db.delete(vehicle)
    db.commit()
