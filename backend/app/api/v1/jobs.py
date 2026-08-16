from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.workers.tasks import JOB_STATUS_STORE
from app.models.models import Inspection

router = APIRouter(prefix="/jobs", tags=["Background AI Jobs"])

@router.get("/{job_id}", response_model=StandardResponse[Dict[str, Any]])
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Polls background AI inspection job execution status (QUEUED, PROCESSING, COMPLETED, FAILED).
    """
    if job_id in JOB_STATUS_STORE:
        return StandardResponse(data=JOB_STATUS_STORE[job_id])

    # Query DB fallback if job store memory entry expired or restarted
    try:
        insp_uuid = UUID(job_id)
        inspection = db.query(Inspection).filter(Inspection.id == insp_uuid).first()
        if inspection:
            sev_level = inspection.severity_assessment.severity_level.value if inspection.severity_assessment else "LOW"
            overall_score = inspection.severity_assessment.overall_score if inspection.severity_assessment else 0.0
            return StandardResponse(data={
                "job_id": job_id,
                "status": inspection.ai_status.value if hasattr(inspection.ai_status, "value") else str(inspection.ai_status),
                "progress_percent": 100 if inspection.ai_status.value == "COMPLETED" else 50,
                "result_summary": {
                    "total_defects": len(inspection.detections or []),
                    "severity_level": sev_level,
                    "risk_score": overall_score * 10.0
                }
            })
    except ValueError:
        pass

    raise HTTPException(status_code=404, detail=f"AI Job {job_id} not found")
