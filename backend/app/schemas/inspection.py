from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.models import AssetTypeEnum, InspectionStatusEnum, SeverityLevelEnum

class DetectionOut(BaseModel):
    id: UUID
    class_name: str
    confidence: float
    bbox: List[float]
    area_sq_m: Optional[float] = None

    class Config:
        from_attributes = True

class MediaOut(BaseModel):
    id: UUID
    file_path: str
    file_type: str
    mime_type: str
    file_size: int

    class Config:
        from_attributes = True

class SeverityOut(BaseModel):
    id: UUID
    overall_score: float
    severity_level: SeverityLevelEnum
    details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class InspectionStatusUpdate(BaseModel):
    status: InspectionStatusEnum
    assigned_engineer: Optional[str] = None
    work_notes: Optional[str] = None
    resolution_notes: Optional[str] = None

class InspectionCreate(BaseModel):
    asset_id: Optional[UUID] = None
    asset_type: Optional[str] = "ROAD"
    latitude: Optional[float] = 12.9716
    longitude: Optional[float] = 77.5946
    device_info: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class InspectionOut(BaseModel):
    id: UUID
    asset_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    asset_type: AssetTypeEnum
    latitude: float
    longitude: float
    captured_at: datetime
    device_info: Optional[Dict[str, Any]] = None
    status: InspectionStatusEnum
    ai_status: InspectionStatusEnum
    upvotes_count: Optional[int] = 0
    assigned_engineer: Optional[str] = None
    work_notes: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    media_items: List[MediaOut] = []
    detections: List[DetectionOut] = []
    severity_assessment: Optional[SeverityOut] = None


    class Config:
        from_attributes = True
