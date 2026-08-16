import time
import logging
import datetime
from typing import Dict, Any, Optional

from app.blockchain.adapters.base import BlockchainAdapter

logger = logging.getLogger("civix_backend")

class MockBlockchainAdapter(BlockchainAdapter):
    """
    In-Memory Development & Offline Test Mock Blockchain Adapter (Singleton).
    Simulates smart contract interaction, tx hashes, block numbers, and events.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MockBlockchainAdapter, cls).__new__(cls)
            cls._instance._init_adapter()
        return cls._instance

    def _init_adapter(self):
        self._inspection_ledger: Dict[str, Dict[str, Any]] = {}
        self._maintenance_ledger: Dict[str, Dict[str, Any]] = {}
        self._block_counter = 1000

    def record_inspection(
        self,
        inspection_id: str,
        result_hash: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        self._block_counter += 1
        tx_hash = f"0xmock_tx_{self._block_counter}_{hash(inspection_id) & 0xffffffff:08x}"
        now_iso = datetime.datetime.utcnow().isoformat()

        record_entry = {
            "inspection_id": inspection_id,
            "result_hash": result_hash,
            "metadata": metadata,
            "tx_hash": tx_hash,
            "block_number": self._block_counter,
            "timestamp": now_iso
        }
        self._inspection_ledger[inspection_id] = record_entry
        logger.info(f"[MOCK BLOCKCHAIN] Recorded Inspection {inspection_id} | Hash: {result_hash[:10]}... | Tx: {tx_hash}")

        return {
            "status": "SUCCESS",
            "tx_hash": tx_hash,
            "block_number": self._block_counter,
            "result_hash": result_hash,
            "timestamp": now_iso
        }

    def record_maintenance(
        self,
        maintenance_id: str,
        asset_id: str,
        record_hash: str
    ) -> Dict[str, Any]:
        self._block_counter += 1
        tx_hash = f"0xmock_maint_tx_{self._block_counter}_{hash(maintenance_id) & 0xffffffff:08x}"
        now_iso = datetime.datetime.utcnow().isoformat()

        record_entry = {
            "maintenance_id": maintenance_id,
            "asset_id": asset_id,
            "record_hash": record_hash,
            "tx_hash": tx_hash,
            "block_number": self._block_counter,
            "timestamp": now_iso
        }
        self._maintenance_ledger[maintenance_id] = record_entry
        logger.info(f"[MOCK BLOCKCHAIN] Recorded Maintenance {maintenance_id} | Asset: {asset_id} | Tx: {tx_hash}")

        return {
            "status": "SUCCESS",
            "tx_hash": tx_hash,
            "block_number": self._block_counter,
            "record_hash": record_hash,
            "timestamp": now_iso
        }

    def get_inspection_record(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        return self._inspection_ledger.get(inspection_id)

    def verify_inspection_hash(self, inspection_id: str, computed_hash: str) -> bool:
        record = self._inspection_ledger.get(inspection_id)
        if not record:
            return False
        return record.get("result_hash") == computed_hash
