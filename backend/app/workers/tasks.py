import io
import logging
from uuid import UUID
from PIL import Image

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.repositories.inspection import InspectionRepository
from app.models.models import InspectionStatusEnum
from app.ai.pipelines.unified_pipeline import get_unified_pipeline
from app.blockchain.services.blockchain_service import get_blockchain_service
from app.services.notification_service import get_notification_service

logger = logging.getLogger("civix_backend")

# In-memory background job tracking state dictionary for frontend polling GET /api/v1/jobs/{job_id}
JOB_STATUS_STORE = {}

def process_ai_inspection_job(inspection_id: str, image_bytes: bytes, db: Session = None):
    """
    Background worker task executing full End-to-End AI Inspection Pipeline:
    1. Preprocessing & Input Decoding
    2. YOLO Object Detection
    3. U-Net Fine-Grained Defect Segmentation
    4. Multi-Factor Feature Engineering
    5. XGBoost Defect Severity Prediction
    6. LSTM Time-Series Predictive Maintenance Forecasting
    7. AI Recommendation Engine Synthesis
    8. PostGIS Spatial Database Persistence
    9. SHA-256 Canonical Blockchain Hash Audit Logging
    10. High/Critical Risk Notification Dispatch
    """
    logger.info(f"Starting Background End-to-End AI Job for Inspection ID: {inspection_id}")
    JOB_STATUS_STORE[inspection_id] = {
        "job_id": inspection_id,
        "status": "PROCESSING",
        "progress_percent": 10,
        "message": "AI Pipeline Started"
    }

    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    repo = InspectionRepository()
    pipeline = get_unified_pipeline()
    bc_service = get_blockchain_service()
    notifier = get_notification_service()

    insp_uuid = UUID(inspection_id) if isinstance(inspection_id, str) else inspection_id

    try:
        inspection = repo.get(db, insp_uuid)
        if not inspection:
            logger.error(f"Inspection {inspection_id} not found in database")
            JOB_STATUS_STORE[inspection_id] = {"status": "FAILED", "error": "Inspection record not found"}
            return

        inspection.ai_status = InspectionStatusEnum.PROCESSING
        db.commit()

        # 1. Image Decoding
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        JOB_STATUS_STORE[inspection_id]["progress_percent"] = 30

        # 2. Run Multimodal Unified AI Pipeline
        infra_type = inspection.asset_type.value if hasattr(inspection.asset_type, "value") else str(inspection.asset_type)
        gis_context = {
            "latitude": inspection.latitude,
            "longitude": inspection.longitude,
            "address": (inspection.device_info or {}).get("address", "Unknown Location")
        }

        pipeline_result, annotated_np = pipeline.process_inspection(
            image_input=image,
            confidence=0.4,
            infrastructure_type=infra_type,
            gis_context=gis_context
        )
        JOB_STATUS_STORE[inspection_id]["progress_percent"] = 70

        # 3. Store Detections & Severity in PostgreSQL
        raw_dets = pipeline_result.get("detection", {}).get("detections", [])
        legacy_detections = []
        for d in raw_dets:
            bbox_dict = d.get("bbox", {})
            bbox_list = [bbox_dict.get("x1", 0), bbox_dict.get("y1", 0), bbox_dict.get("x2", 0), bbox_dict.get("y2", 0)] if isinstance(bbox_dict, dict) else list(bbox_dict)
            legacy_detections.append({
                "class_name": d.get("class_name", "Unknown"),
                "confidence": d.get("confidence", 0.0),
                "bbox": bbox_list,
                "area_sq_m": d.get("area_sq_m", 0.0)
            })

        repo.add_detections(db, inspection.id, legacy_detections)

        sev_data = pipeline_result.get("severity_assessment", {})
        rec_data = pipeline_result.get("recommendation", {})
        pred_data = pipeline_result.get("predictive_maintenance", {})

        repo.add_severity_assessment(db, inspection.id, {
            "overall_score": sev_data.get("overall_score", 0.0),
            "severity_level": sev_data.get("severity_level", "LOW"),
            "details": {
                "risk_score": sev_data.get("risk_score", 0.0),
                "recommendation": rec_data.get("recommended_action"),
                "suggested_timeframe": rec_data.get("suggested_timeframe"),
                "predicted_maintenance_window": pred_data.get("estimated_maintenance_window")
            }
        })

        # Save Annotated Image (After Detection) to permanent storage & media table
        import cv2
        import time as pytime
        from app.services.storage_service import LocalStorageService
        from app.models.models import Media as DBMedia

        storage = LocalStorageService()
        bgr_annot = cv2.cvtColor(annotated_np, cv2.COLOR_RGB2BGR) if len(annotated_np.shape) == 3 else annotated_np
        is_succ, annot_buf = cv2.imencode('.jpg', bgr_annot)
        if is_succ:
            annot_bytes = annot_buf.tobytes()
            annot_path, annot_type, annot_sz = storage.upload_file(
                annot_bytes,
                f"annotated_upload_{int(pytime.time() * 1000)}.jpg",
                "image/jpeg"
            )
            annot_media = DBMedia(
                inspection_id=inspection.id,
                file_path=annot_path,
                file_type="annotated_image",
                mime_type="image/jpeg;role=annotated",
                file_size=annot_sz
            )
            db.add(annot_media)

            dev_info = inspection.device_info or {}
            if not isinstance(dev_info, dict):
                dev_info = {}
            dev_info["annotated_image_url"] = storage.get_download_url(annot_path)
            inspection.device_info = dev_info

        # 4. Record SHA-256 Canonical Hash on Blockchain
        bc_record = bc_service.record_inspection_on_chain(db, str(inspection.id))
        logger.info(f"Recorded Blockchain Audit Hash for {inspection.id} | Hash: {bc_record.get('computed_hash')[:10]}...")

        # 5. Trigger Notifications for High/Critical Risk
        sev_level = sev_data.get("severity_level", "LOW")
        if sev_level in ["HIGH", "CRITICAL"]:
            defect_classes = list(set(d["class_name"] for d in legacy_detections))
            notifier.notify_critical_defect(
                inspection_id=str(inspection.id),
                asset_type=infra_type,
                severity_level=sev_level,
                risk_score=sev_data.get("risk_score", 0.0),
                defect_classes=defect_classes,
                location_desc=gis_context.get("address", "")
            )

        inspection.ai_status = InspectionStatusEnum.COMPLETED
        inspection.status = InspectionStatusEnum.COMPLETED
        db.commit()

        JOB_STATUS_STORE[inspection_id] = {
            "job_id": inspection_id,
            "status": "COMPLETED",
            "progress_percent": 100,
            "result_summary": {
                "total_defects": len(legacy_detections),
                "severity_level": sev_level,
                "risk_score": sev_data.get("risk_score", 0.0),
                "blockchain_verified": True,
                "blockchain_hash": bc_record.get("computed_hash")
            }
        }
        logger.info(f"Successfully finished End-to-End AI Job for Inspection {inspection_id}")

    except Exception as e:
        logger.error(f"Error processing AI job for Inspection {inspection_id}: {e}")
        db.rollback()
        inspection = repo.get(db, inspection_id)
        if inspection:
            inspection.ai_status = InspectionStatusEnum.FAILED
            db.commit()
        JOB_STATUS_STORE[inspection_id] = {
            "job_id": inspection_id,
            "status": "FAILED",
            "progress_percent": 0,
            "error": str(e)
        }
    finally:
        if own_db:
            db.close()
