import enum
import uuid
import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, Enum, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base

try:
    from geoalchemy2 import Geometry
except ImportError:
    def Geometry(*args, **kwargs):
        return Text()




# Enums
class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    ENGINEER = "ENGINEER"
    INSPECTOR = "INSPECTOR"
    CITIZEN = "CITIZEN"

class AssetTypeEnum(str, enum.Enum):
    ROAD = "ROAD"
    BRIDGE = "BRIDGE"
    FLYOVER = "FLYOVER"
    STREETLIGHT = "STREETLIGHT"
    FOOTPATH = "FOOTPATH"

class InspectionStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"

class SeverityLevelEnum(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

# 1. User & Role
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.CITIZEN, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspections = relationship("Inspection", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

# 2. Location
class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(Geometry("POINT", srid=4326), nullable=True)
    address = Column(Text, nullable=True)
    ward = Column(String(100), nullable=True)
    zone = Column(String(100), nullable=True)
    city = Column(String(100), default="Bengaluru")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 3. Asset
class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    asset_type = Column(Enum(AssetTypeEnum), nullable=False)
    description = Column(Text, nullable=True)
    geom = Column(Geometry("GEOMETRY", srid=4326), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ward = Column(String(100), nullable=True)
    zone = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspections = relationship("Inspection", back_populates="asset")
    defects = relationship("Defect", back_populates="asset")
    predictions = relationship("Prediction", back_populates="asset")
    recommendations = relationship("Recommendation", back_populates="asset")
    maintenance_records = relationship("MaintenanceRecord", back_populates="asset")

# 4. Inspection
class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    asset_type = Column(Enum(AssetTypeEnum), default=AssetTypeEnum.ROAD, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(Geometry("POINT", srid=4326), nullable=True)
    captured_at = Column(DateTime, default=datetime.datetime.utcnow)
    device_info = Column(JSON, nullable=True)
    status = Column(Enum(InspectionStatusEnum), default=InspectionStatusEnum.PENDING, nullable=False)
    ai_status = Column(Enum(InspectionStatusEnum), default=InspectionStatusEnum.PENDING, nullable=False)
    upvotes_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


    user = relationship("User", back_populates="inspections")
    asset = relationship("Asset", back_populates="inspections")
    media_items = relationship("Media", back_populates="inspection", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="inspection", cascade="all, delete-orphan")
    severity_assessment = relationship("SeverityAssessment", back_populates="inspection", uselist=False)

# 5. Media
class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # "image" or "video"
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False) # size in bytes
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspection = relationship("Inspection", back_populates="media_items")

# 6. Detection
class Detection(Base):
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=False)
    class_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox = Column(JSON, nullable=False) # [x1, y1, x2, y2]
    area_sq_m = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspection = relationship("Inspection", back_populates="detections")

# 7. Defect
class Defect(Base):
    __tablename__ = "defects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=True)
    defect_type = Column(String(100), nullable=False)
    severity_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    asset = relationship("Asset", back_populates="defects")

# 8. Severity Assessment
class SeverityAssessment(Base):
    __tablename__ = "severity_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    severity_level = Column(Enum(SeverityLevelEnum), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspection = relationship("Inspection", back_populates="severity_assessment")

# 9. Prediction
class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    degradation_score = Column(Float, nullable=False)
    predicted_failure_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    asset = relationship("Asset", back_populates="predictions")

# 10. Recommendation
class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    action_required = Column(Text, nullable=False)
    priority = Column(String(50), default="MEDIUM")
    estimated_cost = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    asset = relationship("Asset", back_populates="recommendations")

# 11. Maintenance Record
class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    status = Column(String(50), default="SCHEDULED")
    description = Column(Text, nullable=True)
    performed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    asset = relationship("Asset", back_populates="maintenance_records")

# 12. Audit Log
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(JSON, nullable=True)

    user = relationship("User", back_populates="audit_logs")

# 13. Report
class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generated_by = Column(UUID(as_uuid=True), nullable=True)
    title = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    format = Column(String(50), default="PDF")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 14. Notification
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")
