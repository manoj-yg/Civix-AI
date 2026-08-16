from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BlockchainAdapter(ABC):
    """
    Abstract Interface for Blockchain Adapters (Ethereum, Polygon, Hyperledger, Mock).
    """

    @abstractmethod
    def record_inspection(
        self,
        inspection_id: str,
        result_hash: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Records inspection SHA-256 result hash onto blockchain contract.
        """
        pass

    @abstractmethod
    def record_maintenance(
        self,
        maintenance_id: str,
        asset_id: str,
        record_hash: str
    ) -> Dict[str, Any]:
        """
        Records maintenance record hash onto blockchain.
        """
        pass

    @abstractmethod
    def get_inspection_record(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves record hash and block timestamp from blockchain.
        """
        pass

    @abstractmethod
    def verify_inspection_hash(self, inspection_id: str, computed_hash: str) -> bool:
        """
        Verifies whether computed hash matches the hash recorded on-chain.
        """
        pass
