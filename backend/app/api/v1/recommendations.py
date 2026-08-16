from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.models.models import Recommendation

router = APIRouter(prefix="/recommendations", tags=["Decision Support"])

@router.get("", response_model=StandardResponse[List[dict]])
def get_recommendations(db: Session = Depends(get_db)):
    items = db.query(Recommendation).all()
    out = []
    for item in items:
        out.append({
            "id": str(item.id),
            "asset_id": str(item.asset_id),
            "action_required": item.action_required,
            "priority": item.priority,
            "estimated_cost": item.estimated_cost
        })
    return StandardResponse(data=out)
