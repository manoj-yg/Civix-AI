from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.schemas.auth import UserOut
from app.models.models import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=StandardResponse[List[UserOut]])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return StandardResponse(data=[UserOut.from_orm(u) for u in users])
