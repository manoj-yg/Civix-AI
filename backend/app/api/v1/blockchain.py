from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.blockchain.schemas.audit import VerificationResponse
from app.blockchain.services.blockchain_service import get_blockchain_service, BlockchainService

router = APIRouter(prefix="/blockchain", tags=["Blockchain Audit & Integrity"])

@router.get("/verify/{inspection_id}", response_model=StandardResponse[VerificationResponse])
def verify_inspection_hash(
    inspection_id: str,
    db: Session = Depends(get_db),
    bc_service: BlockchainService = Depends(get_blockchain_service)
):
    """
    Verifies the integrity of an inspection record by comparing the calculated DB canonical SHA-256 hash
    against the immutable hash stored on the blockchain smart contract.
    """
    verification_res = bc_service.verify_inspection_record(db, inspection_id)
    return StandardResponse(data=verification_res)

@router.post("/record/{inspection_id}", response_model=StandardResponse[Dict[str, Any]])
def record_inspection_on_chain(
    inspection_id: str,
    db: Session = Depends(get_db),
    bc_service: BlockchainService = Depends(get_blockchain_service)
):
    """
    Computes the canonical SHA-256 result hash for an inspection and records it onto the blockchain audit log.
    """
    try:
        res = bc_service.record_inspection_on_chain(db, inspection_id)
        return StandardResponse(data=res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain logging failed: {e}")

@router.get("/records/{inspection_id}", response_model=StandardResponse[Dict[str, Any]])
def get_on_chain_record(
    inspection_id: str,
    bc_service: BlockchainService = Depends(get_blockchain_service)
):
    """
    Retrieves the raw audit record from the blockchain smart contract for a given inspection ID.
    """
    record = bc_service.adapter.get_inspection_record(inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"No blockchain audit record found for inspection {inspection_id}")
    return StandardResponse(data=record)
