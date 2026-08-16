from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.models import AssetTypeEnum

class AssetCreate(BaseModel):
    name: str
    asset_type: AssetTypeEnum
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ward: Optional[str] = None
    zone: Optional[str] = None

class AssetOut(BaseModel):
    id: UUID
    name: str
    asset_type: AssetTypeEnum
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ward: Optional[str] = None
    zone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
