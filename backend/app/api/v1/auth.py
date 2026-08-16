from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import UserRegister, UserLogin, Token, UserOut
from app.schemas.common import StandardResponse
from app.services.auth_service import get_auth_service, AuthService
from app.core.security import create_access_token, decode_access_token
from app.core.exceptions import UnauthorizedException, NotFoundException
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
) -> User:
    if not authorization:
        raise UnauthorizedException("Authorization header missing")
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise UnauthorizedException("Authorization token missing")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid token")
    try:
        user_id = UUID(payload["sub"])
    except (ValueError, TypeError):
        user_id = payload["sub"]

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User")
    return user

@router.post("/register", response_model=StandardResponse[UserOut])
def register(user_in: UserRegister, db: Session = Depends(get_db), auth_service: AuthService = Depends(get_auth_service)):
    user = auth_service.register_user(db, user_in)
    return StandardResponse(data=UserOut.from_orm(user))

@router.post("/login", response_model=StandardResponse[Token])
def login(user_in: UserLogin, db: Session = Depends(get_db), auth_service: AuthService = Depends(get_auth_service)):
    user = auth_service.authenticate_user(db, user_in.email, user_in.password)
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return StandardResponse(data=Token(
        access_token=token,
        expires_in=60 * 24 * 7 * 60,
        role=user.role,
        user_id=user.id,
        user=UserOut.from_orm(user)
    ))


@router.get("/me", response_model=StandardResponse[UserOut])
def me(current_user: User = Depends(get_current_user)):
    return StandardResponse(data=UserOut.from_orm(current_user))
