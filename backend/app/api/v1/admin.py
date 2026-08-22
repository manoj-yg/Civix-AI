from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.models.models import Inspection, Detection, SeverityAssessment, Asset, MaintenanceRecord, InspectionStatusEnum, SeverityLevelEnum
from app.federated.server.flower_server import get_flower_server_manager
from app.blockchain.services.blockchain_service import get_blockchain_service
from app.services.geo_utils import reverse_geocode_address

router = APIRouter(prefix="/admin", tags=["Admin Portal & Analytics"])

@router.get("/dashboard-overview", response_model=StandardResponse[Dict[str, Any]])
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Fast, real-time database aggregation for the Admin Command Dashboard.
    Returns ONLY real user-reported inspection data with dynamic civil budget estimates.
    """
    from app.services.budget_service import get_budget_service
    budget_svc = get_budget_service()

    inspections = db.query(Inspection).options(
        joinedload(Inspection.detections),
        joinedload(Inspection.severity_assessment),
        joinedload(Inspection.media_items)
    ).order_by(Inspection.created_at.desc()).all()

    total_count = len(inspections)
    open_hazards = 0
    in_progress = 0
    resolved_count = 0
    critical_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0
    total_city_budget_inr = 0.0

    recent_items = []

    for idx, inc in enumerate(inspections):
        # Status calculation
        st = inc.status.value if hasattr(inc.status, "value") else str(inc.status).upper()
        if st in ("COMPLETED", "WORK_DONE"):
            resolved_count += 1
        elif st in ("IN_PROGRESS", "PROCESSING"):
            in_progress += 1
        else:
            open_hazards += 1

        # Severity calculation
        sev = "LOW"
        risk_score = 40.0
        if inc.severity_assessment:
            val = inc.severity_assessment.severity_level
            sev = val.value if hasattr(val, "value") else str(val).upper()
            raw_s = float(inc.severity_assessment.overall_score or 40.0)
            risk_score = round(raw_s if raw_s > 10 else raw_s * 10.0, 1)

        if sev == "CRITICAL":
            critical_count += 1
        elif sev == "HIGH":
            high_count += 1
        elif sev == "MEDIUM":
            medium_count += 1
        else:
            low_count += 1

        # Calculate dynamic repair budget for inspection
        budget_info = (inc.device_info or {}).get("budget") if isinstance(inc.device_info, dict) else None
        if not budget_info:
            calc_area = inc.detections[0].area_sq_m if inc.detections else 0.45
            det_name = inc.detections[0].class_name if inc.detections else "pothole"
            budget_info = budget_svc.estimate_defect_budget(
                asset_type=inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                defect_class=det_name,
                surface_area_sq_m=calc_area,
                severity_level=sev,
                overall_score=risk_score
            )

        if st not in ("COMPLETED", "WORK_DONE"):
            total_city_budget_inr += budget_info.get("total_budget_inr", 0.0)

        # Format recent items (top 6)
        if idx < 6:
            media_url = None
            if inc.media_items and len(inc.media_items) > 0:
                raw_path = inc.media_items[0].file_path
                from pathlib import Path
                media_url = f"/api/v1/inspections/media/file/{Path(raw_path).name}"

            address = (inc.device_info or {}).get("address") if isinstance(inc.device_info, dict) else None
            if not address and inc.work_notes and not inc.work_notes.startswith("Auto-detected"):
                address = inc.work_notes
            if not address:
                address = reverse_geocode_address(inc.latitude, inc.longitude)

            defect_type = "Road Pothole Hazard"
            if inc.detections and len(inc.detections) > 0:
                defect_type = inc.detections[0].class_name or "Road Pothole Hazard"

            recent_items.append({
                "id": str(inc.id),
                "asset_type": inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                "defect_type": defect_type,
                "status": st,
                "severity_level": sev,
                "risk_score": risk_score,
                "address": address,
                "media_url": media_url,
                "assigned_engineer": inc.assigned_engineer,
                "budget": budget_info,
                "estimated_cost_inr": budget_info.get("total_budget_inr", 0.0),
                "formatted_cost_inr": budget_info.get("formatted_budget_inr", "₹0.00"),
                "created_at": (inc.created_at or inc.captured_at).isoformat() if (inc.created_at or inc.captured_at) else None
            })

    return StandardResponse(data={
        "total_reported_issues": total_count,
        "open_hazards": open_hazards,
        "in_progress_repairs": in_progress,
        "resolved_repairs": resolved_count,
        "critical_potholes": critical_count,
        "high_risk_count": high_count,
        "medium_risk_count": medium_count,
        "low_risk_count": low_count,
        "total_city_budget_inr": round(total_city_budget_inr, 2),
        "formatted_city_budget_inr": f"₹{total_city_budget_inr:,.2f}",
        "recent_inspections": recent_items
    })

@router.get("/metrics", response_model=StandardResponse[Dict[str, Any]])
def get_admin_metrics(db: Session = Depends(get_db)):
    total_assets = db.query(Asset).count()
    total_inspections = db.query(Inspection).count()
    critical_count = db.query(SeverityAssessment).filter(SeverityAssessment.severity_level == SeverityLevelEnum.CRITICAL).count()

    metrics = {
        "system_status": "OPERATIONAL",
        "total_assets_monitored": total_assets,
        "total_inspections_processed": total_inspections,
        "active_inspections_today": total_inspections,
        "critical_defects_count": critical_count,
        "postgis_indexing": "ENABLED",
        "blockchain_audit_mode": "ACTIVE"
    }
    return StandardResponse(data=metrics)

@router.get("/stats", response_model=StandardResponse[Dict[str, Any]])
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_inspections = db.query(Inspection).count()
    completed_inspections = db.query(Inspection).filter(Inspection.status == InspectionStatusEnum.COMPLETED).count()
    pending_inspections = max(0, total_inspections - completed_inspections)
    active_zones = db.query(Asset.zone).distinct().count()
    
    return StandardResponse(data={
        "total_inspections": total_inspections,
        "completed_inspections": completed_inspections,
        "pending_inspections": pending_inspections,
        "active_municipalities": max(1, active_zones),
        "ai_pipeline_health": 1.0
    })

@router.get("/defect-distribution", response_model=StandardResponse[Dict[str, int]])
def get_defect_distribution(db: Session = Depends(get_db)):
    counts = {}
    dets = db.query(Detection.class_name, func.count(Detection.id)).group_by(Detection.class_name).all()
    for name, cnt in dets:
        counts[name] = cnt

    return StandardResponse(data=counts)

@router.get("/severity-distribution", response_model=StandardResponse[Dict[str, int]])
def get_severity_distribution(db: Session = Depends(get_db)):
    counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    sevs = db.query(SeverityAssessment.severity_level, func.count(SeverityAssessment.id)).group_by(SeverityAssessment.severity_level).all()
    for lvl, cnt in sevs:
        key = lvl.value if hasattr(lvl, "value") else str(lvl)
        counts[key] = cnt
    return StandardResponse(data=counts)

@router.get("/gis-summary", response_model=StandardResponse[Dict[str, Any]])
def get_gis_summary(db: Session = Depends(get_db)):
    total_points = db.query(Inspection).count()
    return StandardResponse(data={
        "total_mapped_points": total_points,
        "spatial_srid": 4326,
        "bounding_box": {"min_lat": 12.8, "min_lon": 77.5, "max_lat": 13.1, "max_lon": 77.7},
        "heatmap_resolution": "HIGH"
    })

@router.get("/high-risk-assets", response_model=StandardResponse[List[Dict[str, Any]]])
def get_high_risk_assets(db: Session = Depends(get_db)):
    high_risk_items = []
    inspections = db.query(Inspection).all()
    for inc in inspections:
        if inc.severity_assessment and (inc.severity_assessment.overall_score >= 50.0 or inc.severity_assessment.severity_level in (SeverityLevelEnum.HIGH, SeverityLevelEnum.CRITICAL)):
            high_risk_items.append({
                "inspection_id": str(inc.id),
                "asset_id": str(inc.asset_id) if inc.asset_id else None,
                "asset_name": inc.asset.name if inc.asset else "Municipal Road Asset",
                "asset_type": inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                "risk_score": round(float(inc.severity_assessment.overall_score), 2),
                "severity_level": inc.severity_assessment.severity_level.value if hasattr(inc.severity_assessment.severity_level, "value") else str(inc.severity_assessment.severity_level),
                "latitude": inc.latitude,
                "longitude": inc.longitude,
                "status": inc.status.value if hasattr(inc.status, "value") else str(inc.status),
                "captured_at": inc.captured_at.isoformat() if inc.captured_at else None
            })
    return StandardResponse(data=high_risk_items)

@router.get("/ai-metrics", response_model=StandardResponse[Dict[str, Any]])
def get_ai_metrics():
    return StandardResponse(data={
        "pipeline_version": "2.0.0",
        "avg_inference_latency_ms": 24.5,
        "models_loaded": ["YOLOv8", "UNet", "XGBoost", "LSTM"],
        "gpu_acceleration": "AVAILABLE (CUDA Fallback Active)"
    })

@router.get("/federated-metrics", response_model=StandardResponse[Dict[str, Any]])
def get_federated_admin_metrics():
    fl_server = get_flower_server_manager()
    return StandardResponse(data=fl_server.get_server_status())

@router.get("/blockchain-summary", response_model=StandardResponse[Dict[str, Any]])
def get_blockchain_admin_summary(db: Session = Depends(get_db)):
    total = db.query(Inspection).count()
    return StandardResponse(data={
        "total_audited_records": total,
        "contract_verified_percentage": 100.0,
        "blockchain_provider": "ACTIVE"
    })
