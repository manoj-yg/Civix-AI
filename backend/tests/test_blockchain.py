import pytest
import uuid
from app.blockchain.utils.hashing import generate_canonical_json, compute_sha256_hash
from app.blockchain.adapters.mock_adapter import MockBlockchainAdapter
from app.blockchain.adapters.web3_adapter import Web3Adapter
from app.blockchain.services.blockchain_service import BlockchainService
from app.models.models import Inspection, InspectionStatusEnum, AssetTypeEnum

def test_canonical_hashing_determinism():
    data_1 = {"z_key": "value2", "a_key": 100, "details": {"b": 2, "a": 1}}
    data_2 = {"a_key": 100, "z_key": "value2", "details": {"a": 1, "b": 2}}

    hash_1 = compute_sha256_hash(data_1)
    hash_2 = compute_sha256_hash(data_2)

    assert len(hash_1) == 64
    assert hash_1 == hash_2, "Canonical hashing must be deterministic regardless of dictionary key order"

def test_mock_blockchain_adapter():
    adapter = MockBlockchainAdapter()
    insp_id = str(uuid.uuid4())
    sample_hash = compute_sha256_hash({"test": "data"})

    rec_result = adapter.record_inspection(insp_id, sample_hash, {"captured_at": "2026-08-16"})
    assert rec_result["status"] == "SUCCESS"
    assert "tx_hash" in rec_result

    # Retrieve record
    on_chain = adapter.get_inspection_record(insp_id)
    assert on_chain is not None
    assert on_chain["result_hash"] == sample_hash

    # Verify hash match
    assert adapter.verify_inspection_hash(insp_id, sample_hash) is True
    assert adapter.verify_inspection_hash(insp_id, "tampered_hash") is False

def test_web3_adapter_fallback():
    # Web3 adapter should fall back gracefully if live EVM node is offline
    web3_adapter = Web3Adapter(rpc_url="http://invalid_rpc_node:8545")
    insp_id = str(uuid.uuid4())
    sample_hash = compute_sha256_hash({"test": "fallback"})

    res = web3_adapter.record_inspection(insp_id, sample_hash, {})
    assert res["status"] == "SUCCESS"
    assert web3_adapter.verify_inspection_hash(insp_id, sample_hash) is True

def test_blockchain_service_verify(db_session):
    # 1. Create a dummy DB inspection record
    insp = Inspection(
        id=uuid.uuid4(),
        asset_type=AssetTypeEnum.ROAD,
        latitude=12.9716,
        longitude=77.5946,
        status=InspectionStatusEnum.COMPLETED,
        ai_status=InspectionStatusEnum.COMPLETED
    )
    db_session.add(insp)
    db_session.commit()

    service = BlockchainService(adapter=MockBlockchainAdapter())

    # Record inspection hash on blockchain
    rec_res = service.record_inspection_on_chain(db_session, str(insp.id))
    assert rec_res["status"] == "SUCCESS"

    # Verify inspection hash against blockchain
    verify_res = service.verify_inspection_record(db_session, str(insp.id))
    assert verify_res.verified is True
    assert verify_res.hash_match is True
    assert verify_res.db_hash == rec_res["computed_hash"]

def test_blockchain_verify_endpoint(client, db_session):
    insp = Inspection(
        id=uuid.uuid4(),
        asset_type=AssetTypeEnum.BRIDGE,
        latitude=12.92,
        longitude=77.62,
        status=InspectionStatusEnum.COMPLETED,
        ai_status=InspectionStatusEnum.COMPLETED
    )
    db_session.add(insp)
    db_session.commit()

    # Record on chain first
    rec_resp = client.post(f"/api/v1/blockchain/record/{insp.id}")
    assert rec_resp.status_code == 200

    # Call verify endpoint
    verify_resp = client.get(f"/api/v1/blockchain/verify/{insp.id}")
    assert verify_resp.status_code == 200
    res_data = verify_resp.json()["data"]
    assert res_data["verified"] is True
    assert res_data["hash_match"] is True
    assert "db_hash" in res_data
