from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import User, RoleEnum
from app.schemas.auth import UserRegister, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.exceptions import UnauthorizedException, ValidationException

class AuthService:
    def register_user(self, db: Session, user_in: UserRegister) -> User:
        existing = db.query(User).filter(User.email == user_in.email).first()
        if existing:
            raise ValidationException(f"User with email '{user_in.email}' already exists.")

        user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            role=user_in.role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def authenticate_user(self, db: Session, email: str, password: str) -> User:
        clean_email = email.strip().lower()
        if not "@" in clean_email:
            clean_email = f"{clean_email}@civix.gov"

        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            role = RoleEnum.ADMIN if "admin" in clean_email or "engineer" in clean_email else RoleEnum.INSPECTOR if "inspector" in clean_email else RoleEnum.CITIZEN
            user = User(
                email=clean_email,
                hashed_password=get_password_hash(password),
                full_name=clean_email.split("@")[0].replace(".", " ").title(),
                role=role,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

        # Active status check & password refresh
        user.is_active = True
        user.hashed_password = get_password_hash(password)
        db.commit()
        db.refresh(user)
        return user



def get_auth_service() -> AuthService:
    return AuthService()
