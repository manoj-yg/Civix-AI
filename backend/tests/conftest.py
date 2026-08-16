import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import Base, engine, SessionLocal
from app.models.models import User, RoleEnum
from app.core.security import create_access_token, get_password_hash
from app.main import app

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def admin_user(db_session):
    user = db_session.query(User).filter(User.email == "admin.fl@civix.ai").first()
    if not user:
        user = User(
            email="admin.fl@civix.ai",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="Admin User",
            role=RoleEnum.ADMIN
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def normal_user(db_session):
    user = db_session.query(User).filter(User.email == "citizen.fl@civix.ai").first()
    if not user:
        user = User(
            email="citizen.fl@civix.ai",
            hashed_password=get_password_hash("CitizenPass123!"),
            full_name="Citizen User",
            role=RoleEnum.CITIZEN
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def admin_user_token_headers(admin_user):
    token = create_access_token(subject=str(admin_user.id), role=admin_user.role.value)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def normal_user_token_headers(normal_user):
    token = create_access_token(subject=str(normal_user.id), role=normal_user.role.value)
    return {"Authorization": f"Bearer {token}"}
