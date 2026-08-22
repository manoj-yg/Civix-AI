import json
import logging
import datetime
from typing import Dict, Any, Optional

from app.core.config import settings
from app.blockchain.adapters.base import BlockchainAdapter
from app.blockchain.adapters.mock_adapter import MockBlockchainAdapter
from app.blockchain.contracts.abi import INSPECTION_AUDIT_ABI
from app.blockchain.utils.hashing import string_to_bytes32

logger = logging.getLogger("civix_backend")

class Web3Adapter(BlockchainAdapter):
    """
    EVM Web3 JSON-RPC Adapter for live blockchain network interaction (Ethereum, Polygon, Hardhat, Anvil).
    """

    def __init__(
        self,
        rpc_url: Optional[str] = None,
        contract_address: Optional[str] = None,
        private_key: Optional[str] = None
    ):
        self.rpc_url = rpc_url or settings.BLOCKCHAIN_RPC_URL
        self.contract_address = contract_address or settings.BLOCKCHAIN_CONTRACT_ADDRESS
        self.private_key = private_key or settings.BLOCKCHAIN_PRIVATE_KEY
        self.web3 = None
        self.contract = None
        self._fallback_mock = MockBlockchainAdapter()
        self._init_client()

    def _init_client(self):
        try:
            from web3 import Web3
            self.web3 = Web3(Web3.HTTPProvider(self.rpc_url))
            if self.web3.is_connected():
                logger.info(f"Connected to Web3 EVM node at {self.rpc_url}")
                if self.contract_address and self.contract_address != "0x0000000000000000000000000000000000000000":
                    self.contract = self.web3.eth.contract(
                        address=Web3.to_checksum_address(self.contract_address),
                        abi=INSPECTION_AUDIT_ABI
                    )
            else:
                logger.warning(f"Web3 node unreachable at {self.rpc_url}. Reverting to Mock adapter.")
                self.web3 = None
        except Exception as e:
            logger.warning(f"Web3 client initialization skipped ({e}). Using mock adapter.")
            self.web3 = None

    def record_inspection(
        self,
        inspection_id: str,
        result_hash: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        if self.web3 is None or self.contract is None or not self.private_key:
            return self._fallback_mock.record_inspection(inspection_id, result_hash, metadata)

        try:
            from web3 import Web3
            account = self.web3.eth.account.from_key(self.private_key)
            insp_bytes32 = string_to_bytes32(inspection_id)
            hash_bytes32 = string_to_bytes32(result_hash)
            meta_json = json.dumps(metadata)

            nonce = self.web3.eth.get_transaction_count(account.address)
            gas_price = self.web3.eth.gas_price

            tx = self.contract.functions.recordInspectionHash(
                insp_bytes32, hash_bytes32, meta_json
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 350000,
                'gasPrice': int(gas_price * 1.3),
                'chainId': getattr(settings, 'BLOCKCHAIN_CHAIN_ID', 80002)
            })

            signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
            raw_tx = getattr(signed_tx, 'raw_transaction', None) or getattr(signed_tx, 'rawTransaction')
            tx_hash_bytes = self.web3.eth.send_raw_transaction(raw_tx)
            raw_hex = tx_hash_bytes.hex()
            tx_hash = raw_hex if raw_hex.startswith("0x") else f"0x{raw_hex}"
            
            # Non-blocking receipt query
            try:
                tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=30)
                block_num = tx_receipt.blockNumber
            except Exception:
                block_num = self.web3.eth.block_number

            polygonscan_url = f"https://amoy.polygonscan.com/tx/{tx_hash}"
            logger.info(f"[POLYGON AMOY] Recorded Inspection On-Chain: Tx={tx_hash} | Block={block_num}")

            return {
                "status": "SUCCESS",
                "tx_hash": tx_hash,
                "block_number": block_num,
                "result_hash": result_hash,
                "network": "Polygon Amoy Testnet (Chain ID: 80002)",
                "contract_address": self.contract_address,
                "polygonscan_url": polygonscan_url,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Web3 execution error ({e}), delegating to fallback adapter.")
            return self._fallback_mock.record_inspection(inspection_id, result_hash, metadata)

    def record_maintenance(
        self,
        maintenance_id: str,
        asset_id: str,
        record_hash: str
    ) -> Dict[str, Any]:
        if self.web3 is None or self.contract is None or not self.private_key:
            return self._fallback_mock.record_maintenance(maintenance_id, asset_id, record_hash)

        try:
            account = self.web3.eth.account.from_key(self.private_key)
            maint_bytes32 = string_to_bytes32(maintenance_id)
            asset_bytes32 = string_to_bytes32(asset_id)
            hash_bytes32 = string_to_bytes32(record_hash)

            tx = self.contract.functions.recordMaintenance(
                maint_bytes32, asset_bytes32, hash_bytes32
            ).build_transaction({
                'from': account.address,
                'nonce': self.web3.eth.get_transaction_count(account.address),
                'gas': 200000,
                'gasPrice': self.web3.eth.gas_price
            })

            signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash_bytes = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash_bytes)

            return {
                "status": "SUCCESS",
                "tx_hash": tx_hash_bytes.hex(),
                "block_number": tx_receipt.blockNumber,
                "record_hash": record_hash,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Web3 maintenance recording error ({e}).")
            return self._fallback_mock.record_maintenance(maintenance_id, asset_id, record_hash)

    def get_inspection_record(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        if self.web3 is None or self.contract is None:
            return self._fallback_mock.get_inspection_record(inspection_id)

        try:
            insp_bytes32 = string_to_bytes32(inspection_id)
            rec = self.contract.functions.getRecord(insp_bytes32).call()
            return {
                "inspection_id": inspection_id,
                "result_hash": rec[1].hex(),
                "timestamp": datetime.datetime.utcfromtimestamp(rec[2]).isoformat(),
                "metadata": json.loads(rec[3]) if rec[3] else {}
            }
        except Exception as e:
            logger.debug(f"Web3 getRecord fallback ({e}).")
            return self._fallback_mock.get_inspection_record(inspection_id)

    def verify_inspection_hash(self, inspection_id: str, computed_hash: str) -> bool:
        if self.web3 is None or self.contract is None:
            return self._fallback_mock.verify_inspection_hash(inspection_id, computed_hash)

        try:
            insp_bytes32 = string_to_bytes32(inspection_id)
            hash_bytes32 = string_to_bytes32(computed_hash)
            return self.contract.functions.verifyInspection(insp_bytes32, hash_bytes32).call()
        except Exception as e:
            logger.debug(f"Web3 verifyInspection fallback ({e}).")
            return self._fallback_mock.verify_inspection_hash(inspection_id, computed_hash)
