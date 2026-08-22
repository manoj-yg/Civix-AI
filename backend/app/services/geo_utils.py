import math
from typing import Tuple, Optional

# Major Bangalore and Indian Urban corridors for fast offline high-precision reverse geocoding
URBAN_CORRIDORS = [
    {"name": "Outer Ring Road, Bellandur, Bengaluru", "lat": 12.9260, "lng": 77.6762, "radius": 0.04},
    {"name": "100 Feet Road, Indiranagar, Bengaluru", "lat": 12.9719, "lng": 77.6412, "radius": 0.03},
    {"name": "Hosur Main Road, Electronic City Phase 1, Bengaluru", "lat": 12.8452, "lng": 77.6602, "radius": 0.05},
    {"name": "MG Road, Central Business District, Bengaluru", "lat": 12.9756, "lng": 77.6066, "radius": 0.025},
    {"name": "Koramangala 80 Feet Road, 4th Block, Bengaluru", "lat": 12.9352, "lng": 77.6245, "radius": 0.03},
    {"name": "Whitefield Main Road, ITPL, Bengaluru", "lat": 12.9863, "lng": 77.7337, "radius": 0.045},
    {"name": "Sarjapur Road, Haralur Junction, Bengaluru", "lat": 12.9110, "lng": 77.6750, "radius": 0.035},
    {"name": "Hebbal Flyover, Bellary Road, Bengaluru", "lat": 13.0358, "lng": 77.5970, "radius": 0.04},
    {"name": "Bannerghatta Main Road, Bilekahalli, Bengaluru", "lat": 12.8984, "lng": 77.5996, "radius": 0.04},
    {"name": "HSR Layout, 27th Main Sector 1, Bengaluru", "lat": 12.9121, "lng": 77.6446, "radius": 0.03},
    {"name": "Yeshwanthpur Industrial Area, Tumkur Road, Bengaluru", "lat": 13.0280, "lng": 77.5408, "radius": 0.04},
    {"name": "Malleshwaram 18th Cross, Margosa Road, Bengaluru", "lat": 13.0068, "lng": 77.5703, "radius": 0.025},
    {"name": "Jayanagar 4th Block, 11th Main Road, Bengaluru", "lat": 12.9299, "lng": 77.5833, "radius": 0.03},
    {"name": "Old Madras Road, KR Puram Hanging Bridge, Bengaluru", "lat": 13.0033, "lng": 77.6961, "radius": 0.04},
    {"name": "Mysore Road, Satellite Bus Station, Bengaluru", "lat": 12.9550, "lng": 77.5400, "radius": 0.04}
]

def reverse_geocode_address(lat: float, lng: float) -> str:
    """
    Fast, deterministic reverse geocoding to resolve GPS coordinates into human-readable area addresses.
    Uses nearest-neighbor corridor proximity search.
    """
    if not lat or not lng:
        return "Bengaluru Urban Corridor, Karnataka"

    best_match = None
    min_dist = float('inf')

    for corridor in URBAN_CORRIDORS:
        # Euclidean degree approximation (fastest calculation)
        d_lat = lat - corridor["lat"]
        d_lng = lng - corridor["lng"]
        dist = math.sqrt(d_lat * d_lat + d_lng * d_lng)

        if dist < min_dist:
            min_dist = dist
            best_match = corridor

    if best_match and min_dist <= 0.08:
        return best_match["name"]
    
    # Generic urban formatted fallback
    return f"Road Corridor at ({lat:.5f}° N, {lng:.5f}° E), Bengaluru Urban"
