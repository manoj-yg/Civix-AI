from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel

class GISNearbyQuery(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float = 5000.0 # 5 km default
    asset_type: Optional[str] = None
    severity: Optional[str] = None

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float # severity score or defect density weight

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
