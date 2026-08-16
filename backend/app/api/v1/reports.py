from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.models.models import Report
from app.services.report_service import get_report_service, ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=StandardResponse[List[dict]])
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).all()
    out = []
    for r in reports:
        out.append({
            "id": str(r.id),
            "title": r.title,
            "file_url": r.file_url,
            "format": r.format,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return StandardResponse(data=out)

@router.get("/json/{inspection_id}", response_model=StandardResponse[Dict[str, Any]])
def generate_json_report(
    inspection_id: str,
    db: Session = Depends(get_db),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Generates a structured JSON engineering report containing defects, risk scores,
    trend analysis, model versioning, and blockchain verification status.
    """
    try:
        report_dict = report_service.generate_report_dict(db, inspection_id)
        return StandardResponse(data=report_dict)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {e}")

@router.get("/pdf/{inspection_id}")
def download_pdf_report(
    inspection_id: str,
    db: Session = Depends(get_db),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Generates and downloads a formatted PDF engineering inspection report.
    """
    try:
        report_dict = report_service.generate_report_dict(db, inspection_id)
        pdf_bytes = report_service.generate_pdf_bytes(report_dict)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=CIVIX_Report_{inspection_id[:8]}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {e}")
