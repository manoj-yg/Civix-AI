import io
import json
import time
import logging
import datetime
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.models import Inspection
from app.blockchain.services.blockchain_service import BlockchainService

logger = logging.getLogger("civix_backend")

class ReportService:
    """
    Automated PDF & JSON Engineering Report Generation Service.
    Compiles multi-model inspection outputs, risk scores, historical trends, recommendations,
    model version metadata, and blockchain cryptographic verification status.
    """

    def generate_report_dict(self, db: Session, inspection_id: str) -> Dict[str, Any]:
        try:
            insp_uuid = UUID(str(inspection_id))
        except ValueError:
            raise ValueError(f"Invalid Inspection UUID: {inspection_id}")

        inspection = db.query(Inspection).filter(Inspection.id == insp_uuid).first()
        if not inspection:
            raise ValueError(f"Inspection {inspection_id} not found in database")

        detections = [
            {
                "class_name": d.class_name,
                "confidence": round(d.confidence, 4),
                "bbox": d.bbox,
                "area_sq_m": d.area_sq_m
            }
            for d in (inspection.detections or [])
        ]

        sev = inspection.severity_assessment
        severity_level = sev.severity_level.value if (sev and hasattr(sev.severity_level, "value")) else (sev.severity_level if sev else "LOW")
        overall_score = sev.overall_score if sev else 0.0
        risk_score = round(overall_score * 10.0, 2)
        details = sev.details if (sev and sev.details) else {}

        # Query blockchain verification status
        bc_service = BlockchainService()
        verification_data = bc_service.verify_inspection_record(db, str(inspection.id))

        report_data = {
            "report_title": "CIVIX AI Infrastructure Damage & Integrity Report",
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "inspection_id": str(inspection.id),
            "location": {
                "latitude": inspection.latitude,
                "longitude": inspection.longitude,
                "address": (inspection.device_info or {}).get("address", f"Coordinates: {inspection.latitude}, {inspection.longitude}")
            },
            "asset_info": {
                "asset_type": inspection.asset_type.value if hasattr(inspection.asset_type, "value") else str(inspection.asset_type),
                "asset_id": str(inspection.asset_id) if inspection.asset_id else None
            },
            "defects_detected": detections,
            "total_defects_count": len(detections),
            "severity_assessment": {
                "overall_score": overall_score,
                "risk_score": risk_score,
                "severity_level": severity_level
            },
            "predictive_maintenance_trend": {
                "forecasted_window": details.get("recommendation", "30-60 days"),
                "deterioration_trend": "ELEVATED" if risk_score > 50 else "STABLE"
            },
            "recommendation": {
                "action": details.get("recommendation", "Schedule routine field maintenance."),
                "priority": severity_level
            },
            "model_versioning": {
                "pipeline_version": "2.0.0",
                "yolo": "YOLOv8_Small_RDD",
                "unet": "UNet_Defect_Segmentation",
                "xgboost": "XGBoost_Infrastructure_Severity",
                "lstm": "LSTM_Predictive_Maintenance"
            },
            "timestamp": inspection.captured_at.isoformat() if inspection.captured_at else None,
            "blockchain_verification": {
                "verified": verification_data.verified,
                "hash_match": verification_data.hash_match,
                "canonical_sha256_hash": verification_data.db_hash,
                "blockchain_recorded_hash": verification_data.blockchain_hash,
                "block_number": verification_data.block_number
            }
        }

        return report_data

    def generate_pdf_bytes(self, report_dict: Dict[str, Any]) -> bytes:
        """
        Generates a formatted PDF report document bytes stream.
        Uses ReportLab if available, or structured ASCII PDF byte stream fallback.
        """
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle(
                'TitleStyle',
                parent=styles['Heading1'],
                fontSize=18,
                textColor=colors.HexColor('#1E293B'),
                spaceAfter=12
            )

            story.append(Paragraph(report_dict.get("report_title", "CIVIX AI Report"), title_style))
            story.append(Spacer(1, 10))

            info_text = (
                f"<b>Inspection ID:</b> {report_dict.get('inspection_id')}<br/>"
                f"<b>Asset Type:</b> {report_dict.get('asset_info', {}).get('asset_type')}<br/>"
                f"<b>Location:</b> {report_dict.get('location', {}).get('address')}<br/>"
                f"<b>Captured At:</b> {report_dict.get('timestamp')}<br/>"
                f"<b>Severity Level:</b> {report_dict.get('severity_assessment', {}).get('severity_level')} "
                f"(Risk Score: {report_dict.get('severity_assessment', {}).get('risk_score')}/100)<br/>"
                f"<b>Blockchain Verified:</b> {'YES (Hash Match)' if report_dict.get('blockchain_verification', {}).get('verified') else 'PENDING/FAILED'}<br/>"
                f"<b>Canonical SHA-256:</b> {report_dict.get('blockchain_verification', {}).get('canonical_sha256_hash')}"
            )
            story.append(Paragraph(info_text, styles['Normal']))
            story.append(Spacer(1, 15))

            rec_text = (
                f"<b>Recommended Action:</b> {report_dict.get('recommendation', {}).get('action')}<br/>"
                f"<b>Priority:</b> {report_dict.get('recommendation', {}).get('priority')}"
            )
            story.append(Paragraph(rec_text, styles['Heading3']))

            doc.build(story)
            return buf.getvalue()
        except Exception:
            # Fallback simple text PDF buffer
            pdf_str = (
                f"%PDF-1.4\n"
                f"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
                f"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
                f"3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
                f"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
                f"5 0 obj << /Length 200 >> stream\n"
                f"BT /F1 12 Tf 50 750 Td (CIVIX AI Inspection Report: {report_dict.get('inspection_id')}) Tj ET\n"
                f"endstream\nendobj\n"
                f"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000224 00000 n \n0000000293 00000 n \n"
                f"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n545\n%%EOF"
            )
            return pdf_str.encode('utf-8')

def get_report_service() -> ReportService:
    return ReportService()
