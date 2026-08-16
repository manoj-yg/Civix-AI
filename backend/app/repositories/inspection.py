from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.models import Inspection, Media, Detection, SeverityAssessment

class InspectionRepository(BaseRepository[Inspection]):
    def __init__(self):
        super().__init__(Inspection)

    def add_media(self, db: Session, inspection_id: UUID, file_path: str, file_type: str, mime_type: str, file_size: int) -> Media:
        media = Media(
            inspection_id=inspection_id,
            file_path=file_path,
            file_type=file_type,
            mime_type=mime_type,
            file_size=file_size
        )
        db.add(media)
        db.commit()
        db.refresh(media)
        return media

    def add_detections(self, db: Session, inspection_id: UUID, detections_list: List[dict]) -> List[Detection]:
        objs = []
        for d in detections_list:
            det = Detection(
                inspection_id=inspection_id,
                class_name=d.get("class_name", "Unknown"),
                confidence=d.get("confidence", 0.0),
                bbox=d.get("bbox", []),
                area_sq_m=d.get("area_sq_m")
            )
            db.add(det)
            objs.append(det)
        db.commit()
        return objs

    def add_severity_assessment(self, db: Session, inspection_id: UUID, assessment_data: dict) -> SeverityAssessment:
        sa = db.query(SeverityAssessment).filter(SeverityAssessment.inspection_id == inspection_id).first()
        if sa:
            sa.overall_score = assessment_data.get("overall_score", 0.0)
            sa.severity_level = assessment_data.get("severity_level", "LOW")
            sa.details = assessment_data.get("details", {})
        else:
            sa = SeverityAssessment(
                inspection_id=inspection_id,
                overall_score=assessment_data.get("overall_score", 0.0),
                severity_level=assessment_data.get("severity_level", "LOW"),
                details=assessment_data.get("details", {})
            )
            db.add(sa)
        db.commit()
        db.refresh(sa)
        return sa
