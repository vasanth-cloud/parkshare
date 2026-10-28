const fs = require('fs');

// 1. Patch rentals_service.py
let serviceCode = fs.readFileSync('backend/app/services/rentals_service.py', 'utf8');
const isCRLF = serviceCode.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

if (!serviceCode.includes('def update_door_delivery')) {
  const target = `    @staticmethod${nl}    def create_booking(data: RentalBookingCreate) -> RentalBookingOut:`;
  const addition = `    @staticmethod${nl}    def update_door_delivery(vehicle_id: str, door_delivery_available: bool) -> RentalVehicleSchema:${nl}        for v in SAMPLE_FLEET:${nl}            if v.id == vehicle_id:${nl}                v.doorDeliveryAvailable = door_delivery_available${nl}                features = [f for f in v.features if f not in ("Doorstep Delivery Available", "Hub Pickup Only")]${nl}                if door_delivery_available:${nl}                    features.append("Doorstep Delivery Available")${nl}                else:${nl}                    features.append("Hub Pickup Only")${nl}                v.features = features${nl}                _save_fleet(SAMPLE_FLEET)${nl}                return v${nl}        raise ValueError(f"Rental vehicle with id '{vehicle_id}' not found")${nl}${nl}`;

  if (serviceCode.includes(target)) {
    serviceCode = serviceCode.replace(target, addition + target);
    fs.writeFileSync('backend/app/services/rentals_service.py', serviceCode, 'utf8');
    console.log('Added update_door_delivery to rentals_service.py');
  } else {
    console.error('Target not found in rentals_service.py');
  }
} else {
  console.log('update_door_delivery already in rentals_service.py');
}

// 2. Patch routers/rentals.py
let routerCode = fs.readFileSync('backend/app/routers/rentals.py', 'utf8');
const rnl = routerCode.includes('\r\n') ? '\r\n' : '\n';

if (!routerCode.includes('update_vehicle_door_delivery')) {
  const target = `@router.post("/book",`;
  const addition = `class DoorDeliveryToggleRequest(BaseModel):${rnl}    doorDeliveryAvailable: bool${rnl}${rnl}@router.patch("/{vehicle_id}/door-delivery", response_model=RentalVehicleSchema)${rnl}@router.post("/{vehicle_id}/door-delivery", response_model=RentalVehicleSchema)${rnl}def update_vehicle_door_delivery(vehicle_id: str, data: DoorDeliveryToggleRequest):${rnl}    try:${rnl}        return RentalsService.update_door_delivery(vehicle_id, data.doorDeliveryAvailable)${rnl}    except ValueError as e:${rnl}        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))${rnl}${rnl}`;

  if (routerCode.includes(target)) {
    routerCode = routerCode.replace(target, addition + target);
    fs.writeFileSync('backend/app/routers/rentals.py', routerCode, 'utf8');
    console.log('Added update_vehicle_door_delivery to routers/rentals.py');
  } else {
    console.error('Target not found in routers/rentals.py');
  }
} else {
  console.log('update_vehicle_door_delivery already in routers/rentals.py');
}

