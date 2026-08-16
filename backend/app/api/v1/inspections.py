from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.inspection import InspectionCreate, InspectionOut, MediaOut
from app.schemas.common import StandardResponse
from app.models.models import Inspection, InspectionStatusEnum, AssetTypeEnum

from app.repositories.inspection import InspectionRepository
from app.services.storage_service import get_storage_service, StorageService
from app.services.gis_service import get_gis_service, GISService
from app.workers.tasks import process_ai_inspection_job
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/inspections", tags=["Inspections"])

@router.post("", response_model=StandardResponse[InspectionOut])
def create_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db)
):
    norm_type = (payload.asset_type or "ROAD").upper()
    infra_enum = getattr(AssetTypeEnum, norm_type) if hasattr(AssetTypeEnum, norm_type) else AssetTypeEnum.ROAD

    inspection = Inspection(
        asset_id=payload.asset_id,
        asset_type=infra_enum,
        latitude=payload.latitude if payload.latitude is not None else 12.9716,
        longitude=payload.longitude if payload.longitude is not None else 77.5946,
        device_info=payload.device_info,
        status=InspectionStatusEnum.PENDING,
        ai_status=InspectionStatusEnum.PENDING
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return StandardResponse(data=InspectionOut.from_orm(inspection))


@router.post("/{id}/media", response_model=StandardResponse[MediaOut])
async def upload_inspection_media(
    id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service)
):
    repo = InspectionRepository()
    inspection = repo.get(db, id)
    if not inspection:
        raise NotFoundException("Inspection", id)

    contents = await file.read()
    file_path, file_type, file_size = storage.upload_file(contents, file.filename, file.content_type)
    media = repo.add_media(db, id, file_path, file_type, file.content_type, file_size)

    # Queue AI job in background if image
    if file_type == "image":
        background_tasks.add_task(process_ai_inspection_job, str(id), contents)

    return StandardResponse(data=MediaOut.from_orm(media))

@router.get("/nearby", response_model=StandardResponse[List[dict]])
def get_nearby_inspections(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: float = Query(5000.0),
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    results = gis_service.get_nearby_inspections(db, latitude, longitude, radius_meters)
    return StandardResponse(data=results)

@router.get("/{id}", response_model=StandardResponse[InspectionOut])
def get_inspection(id: UUID, db: Session = Depends(get_db)):
    repo = InspectionRepository()
    inspection = repo.get(db, id)
    if not inspection:
        raise NotFoundException("Inspection", id)
    return StandardResponse(data=InspectionOut.from_orm(inspection))

@router.get("", response_model=StandardResponse[List[InspectionOut]])
def list_inspections(
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    repo = InspectionRepository()
    items = repo.get_multi(db, skip=skip, limit=limit)
    return StandardResponse(data=[InspectionOut.from_orm(item) for item in items])

@router.post("/{id}/upvote", response_model=StandardResponse[InspectionOut])
def upvote_inspection(id: UUID, db: Session = Depends(get_db)):
    repo = InspectionRepository()
    inspection = repo.get(db, id)
    if not inspection:
        raise NotFoundException("Inspection", id)
    
    current_count = getattr(inspection, "upvotes_count", 0) or 0
    inspection.upvotes_count = current_count + 1
    db.commit()
    db.refresh(inspection)
    return StandardResponse(data=InspectionOut.from_orm(inspection))

