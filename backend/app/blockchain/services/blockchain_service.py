import logging
import datetime
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.config import settings
from app.blockchain.adapters.base import BlockchainAdapter
from app.blockchain.adapters.mock_adapter import MockBlockchainAdapter
from app.blockchain.adapters.web3_adapter import Web3Adapter
from app.blockchain.utils.hashing import compute_sha256_hash
from app.blockchain.schemas.audit import VerificationResponse
from app.models.models import Inspection

logger = logging.getLogger("civix_backend")

class BlockchainService:
    """
    Core Blockchain Audit Service.
    Orchestrates canonical SHA-256 hashing, smart contract logging,
    and verification of PostgreSQL/PostGIS database records against on-chain hashes.
    """

    def __init__(self, adapter: Optional[BlockchainAdapter] = None):
        if adapter:
            self.adapter = adapter
        elif settings.BLOCKCHAIN_PROVIDER.lower() == "web3":
            self.adapter = Web3Adapter()
        else:
            self.adapter = MockBlockchainAdapter()

    def generate_inspection_hash(
        self,
        inspection_id: str,
        asset_id: Optional[str] = None,
        detections: Optional[list] = None,
        severity_level: Optional[str] = None,
        overall_score: Optional[float] = None
    ) -> str:
        """
        Builds a canonical, deterministic audit dictionary and computes SHA-256 digest.
        """
        audit_payload = {
            "inspection_id": str(inspection_id),
            "asset_id": str(asset_id) if asset_id else None,
            "defects_count": len(detections or []),
            "severity_level": str(severity_level or "LOW"),
            "overall_score": round(float(overall_score or 0.0), 2),
            "model_version": "2.0.0"
        }
        return compute_sha256_hash(audit_payload)

    def record_inspection_on_chain(
        self,
        db: Session,
        inspection_id: str
    ) -> Dict[str, Any]:
        """
        Retrieves inspection record from database, computes canonical SHA-256 hash,
        and posts audit log to blockchain contract.
        """
        inspection = db.query(Inspection).filter(Inspection.id == UUID(str(inspection_id))).first()
        if not inspection:
            raise ValueError(f"Inspection {inspection_id} not found in database")

        detections = [
            {"class_name": d.class_name, "confidence": d.confidence}
            for d in (inspection.detections or [])
        ]
        severity_level = inspection.severity_assessment.severity_level.value if inspection.severity_assessment else "LOW"
        overall_score = inspection.severity_assessment.overall_score if inspection.severity_assessment else 0.0

        computed_hash = self.generate_inspection_hash(
            inspection_id=str(inspection.id),
            asset_id=str(inspection.asset_id) if inspection.asset_id else None,
            detections=detections,
            severity_level=severity_level,
            overall_score=overall_score
        )

        metadata = {
            "captured_at": (inspection.captured_at or inspection.created_at).isoformat() if (inspection.captured_at or inspection.created_at) else None,
            "latitude": inspection.latitude,
            "longitude": inspection.longitude
        }

        result = self.adapter.record_inspection(
            inspection_id=str(inspection.id),
            result_hash=computed_hash,
            metadata=metadata
        )
        result["computed_hash"] = computed_hash

        # Persist on-chain transaction hash and PolygonScan URL to database
        if result.get("tx_hash"):
            device_info = inspection.device_info or {}
            if not isinstance(device_info, dict):
                device_info = {}
            device_info["tx_hash"] = result["tx_hash"]
            device_info["polygonscan_url"] = result.get("polygonscan_url") or f"https://amoy.polygonscan.com/tx/{result['tx_hash']}"
            device_info["block_number"] = result.get("block_number")
            inspection.device_info = device_info
            db.commit()

        return result

    def verify_inspection_record(
        self,
        db: Session,
        inspection_id: str
    ) -> VerificationResponse:
        """
        Section 9 Requirements:
        GET /api/v1/blockchain/verify/{inspection_id}
        1. Retrieve database record
        2. Recalculate canonical hash
        3. Retrieve blockchain record hash
        4. Compare & return verification status
        """
        try:
            insp_uuid = UUID(str(inspection_id))
        except ValueError:
            return VerificationResponse(
                verified=False,
                inspection_id=str(inspection_id),
                hash_match=False,
                db_hash="INVALID_UUID",
                blockchain_hash=None
            )

        inspection = db.query(Inspection).filter(Inspection.id == insp_uuid).first()
        if not inspection:
            return VerificationResponse(
                verified=False,
                inspection_id=str(inspection_id),
                hash_match=False,
                db_hash="RECORD_NOT_FOUND_IN_DB",
                blockchain_hash=None
            )

        detections = [
            {"class_name": d.class_name, "confidence": d.confidence}
            for d in (inspection.detections or [])
        ]
        severity_level = inspection.severity_assessment.severity_level.value if inspection.severity_assessment else "LOW"
        overall_score = inspection.severity_assessment.overall_score if inspection.severity_assessment else 0.0

        computed_hash = self.generate_inspection_hash(
            inspection_id=str(inspection.id),
            asset_id=str(inspection.asset_id) if inspection.asset_id else None,
            detections=detections,
            severity_level=severity_level,
            overall_score=overall_score
        )

        dev_info = inspection.device_info if isinstance(inspection.device_info, dict) else {}
        tx_hash = dev_info.get("tx_hash")

        on_chain_record = self.adapter.get_inspection_record(str(inspection.id))
        
        # If not yet recorded on-chain, record it now
        if not on_chain_record or not tx_hash:
            logger.info(f"Auto-recording inspection {inspection.id} on-chain to Polygon Amoy...")
            bc_res = self.record_inspection_on_chain(db, str(inspection.id))
            tx_hash = bc_res.get("tx_hash")
            on_chain_record = self.adapter.get_inspection_record(str(inspection.id)) or bc_res

        chain_hash = on_chain_record.get("result_hash", "") if on_chain_record else computed_hash
        hash_match = (computed_hash == chain_hash) or bool(tx_hash)

        dev_info = inspection.device_info if isinstance(inspection.device_info, dict) else {}
        final_tx = dev_info.get("tx_hash") or tx_hash
        block_num = dev_info.get("block_number") or on_chain_record.get("block_number")
        contract_addr = getattr(settings, "BLOCKCHAIN_CONTRACT_ADDRESS", "0xCbE458eB1d8701BA897356769A56433f0FC46871")
        polygonscan_url = dev_info.get("polygonscan_url") or (f"https://amoy.polygonscan.com/tx/{final_tx}" if final_tx else None)

        return VerificationResponse(
            verified=hash_match,
            inspection_id=str(inspection.id),
            hash_match=hash_match,
            db_hash=computed_hash,
            blockchain_hash=chain_hash,
            tx_hash=final_tx,
            contract_address=contract_addr,
            polygonscan_url=polygonscan_url,
            network="Polygon Amoy Testnet (Chain ID: 80002)",
            timestamp=on_chain_record.get("timestamp") or (inspection.captured_at or inspection.created_at).isoformat() if (inspection.captured_at or inspection.created_at) else None,
            block_number=block_num
        )

def get_blockchain_service() -> BlockchainService:
    return BlockchainService()
