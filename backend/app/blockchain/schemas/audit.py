from typing import Optional, Dict, Any
from pydantic import BaseModel

class AuditRecordCreate(BaseModel):
    inspection_id: str
    asset_id: Optional[str] = None
    defect_summary: Optional[Dict[str, Any]] = None
    severity_level: Optional[str] = None
    overall_score: Optional[float] = None
    model_version: Optional[str] = None

class VerificationResponse(BaseModel):
    verified: bool
    inspection_id: str
    hash_match: bool
    db_hash: str
    blockchain_hash: Optional[str] = None
    timestamp: Optional[str] = None
    block_number: Optional[int] = None

class MaintenanceRecordCreate(BaseModel):
    maintenance_id: str
    asset_id: str
    action: str
    cost: Optional[float] = None
    performed_at: Optional[str] = None
