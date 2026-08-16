from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.asset import AssetCreate, AssetOut
from app.schemas.common import StandardResponse
from app.models.models import Asset

router = APIRouter(prefix="/assets", tags=["Public Assets"])

@router.post("", response_model=StandardResponse[AssetOut])
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    asset = Asset(
        name=payload.name,
        asset_type=payload.asset_type,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        ward=payload.ward,
        zone=payload.zone
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return StandardResponse(data=AssetOut.from_orm(asset))

@router.get("", response_model=StandardResponse[List[AssetOut]])
def list_assets(skip: int = Query(0), limit: int = Query(50), db: Session = Depends(get_db)):
    items = db.query(Asset).offset(skip).limit(limit).all()
    return StandardResponse(data=[AssetOut.from_orm(item) for item in items])
