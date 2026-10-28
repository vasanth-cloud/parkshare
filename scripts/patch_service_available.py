import os

file_path = os.path.join("backend", "app", "services", "rentals_service.py")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

target = """        # Filter only ACTIVE and isAvailable vehicles
        results = [v for v in SAMPLE_FLEET if v.status == "ACTIVE" and v.isAvailable]"""

replacement = """        # Return ACTIVE fleet vehicles, with isAvailable accurately reflecting booking status
        results = [v for v in SAMPLE_FLEET if v.status == "ACTIVE"]
        for v in results:
            has_active_booking = any(
                b.vehicle.id == v.id and b.status in ("CONFIRMED", "IN_PROGRESS")
                for b in SAMPLE_RENTAL_BOOKINGS
            )
            v.isAvailable = not has_active_booking"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully updated get_available_vehicles in rentals_service.py")
else:
    print("Target not found in rentals_service.py")

