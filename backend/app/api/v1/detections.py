import io
import base64
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
import numpy as np

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.schemas.inspection import DetectionOut
from app.models.models import Detection, Inspection, InspectionStatusEnum, SeverityLevelEnum, AssetTypeEnum
from app.services.ai_service import get_ai_service

router = APIRouter(prefix="/detections", tags=["Detections & AI"])

@router.get("/inspection/{inspection_id}", response_model=StandardResponse[List[DetectionOut]])
def get_inspection_detections(inspection_id: UUID, db: Session = Depends(get_db)):
    items = db.query(Detection).filter(Detection.inspection_id == inspection_id).all()
    return StandardResponse(data=[DetectionOut.from_orm(item) for item in items])

@router.post("/live-frame")
async def process_live_stream_frame(
    file: Optional[UploadFile] = File(None),
    frame_base64: Optional[str] = Form(None),
    latitude: float = Form(12.9716),
    longitude: float = Form(77.5946),
    asset_type: str = Form("road"),
    db: Session = Depends(get_db)
):
    """
    Real-Time Live Video / Camera Stream Defect Processor.
    Automatically detects potholes and cracks in real-time, categorizes them,
    stores them in Neon PostGIS Database, and updates GIS Live Map.
    """
    try:
        # Load frame image
        if file:
            contents = await file.read()
            img = Image.open(io.BytesIO(contents)).convert("RGB")
        elif frame_base64:
            if "," in frame_base64:
                frame_base64 = frame_base64.split(",")[1]
            contents = base64.b64decode(frame_base64)
            img = Image.open(io.BytesIO(contents)).convert("RGB")
        else:
            raise HTTPException(status_code=400, detail="Missing frame payload")

        img_np = np.array(img)
        ai_service = get_ai_service()
        detections, severity_assessment, _ = ai_service.run_image_inference(img_np, confidence=0.40)

        db_inspection_id = None
        saved_to_db = False

        # Auto-create DB record if defects found
        if len(detections) > 0:
            norm_type = asset_type.upper()
            infra_enum = getattr(AssetTypeEnum, norm_type) if hasattr(AssetTypeEnum, norm_type) else AssetTypeEnum.ROAD

            inspection = Inspection(
                asset_type=infra_enum,
                latitude=latitude,
                longitude=longitude,
                status=InspectionStatusEnum.COMPLETED,
                ai_status=InspectionStatusEnum.COMPLETED
            )
            db.add(inspection)
            db.commit()
            db.refresh(inspection)
            db_inspection_id = str(inspection.id)

            # Store detection records
            for d in detections:
                det = Detection(
                    inspection_id=inspection.id,
                    class_name=str(d["class_name"]),
                    confidence=float(d["confidence"]),
                    area_sq_m=float(d.get("area_sq_m", 0.35)),
                    bbox=d["bbox"]
                )
                db.add(det)

            
            db.commit()
            saved_to_db = True

        return {
            "status": "success",
            "frame_processed": True,
            "defects_detected_count": len(detections),
            "detections": detections,
            "severity_assessment": severity_assessment,
            "saved_to_db": saved_to_db,
            "inspection_id": db_inspection_id
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "detections": [],
            "saved_to_db": False
        }
