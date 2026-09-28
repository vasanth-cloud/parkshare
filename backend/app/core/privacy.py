import math
from typing import Tuple

def anonymize_location(latitude: float, longitude: float, approx_radius_meters: float = 250.0) -> Tuple[float, float]:
    """
    Slightly offsets coordinates deterministically for unconfirmed search views
    so the exact driveway or house location is not publicly leaked.
    """
    # Simple deterministic offset based on coordinate values
    lat_offset = (math.sin(latitude * 100) * (approx_radius_meters / 111000.0))
    lng_offset = (math.cos(longitude * 100) * (approx_radius_meters / (111000.0 * math.cos(math.radians(latitude)))))
    
    return round(latitude + lat_offset, 5), round(longitude + lng_offset, 5)

def sanitize_listing_address_for_public(address: str, pincode: str, city: str, area: str) -> str:
    """
    Returns neighborhood level address for public search (e.g., 'Koramangala 4th Block, Bengaluru')
    hiding exact building/street numbers.
    """
    parts = [p for p in [area, city, pincode] if p]
    return ", ".join(parts) if parts else "Approximate Location"
