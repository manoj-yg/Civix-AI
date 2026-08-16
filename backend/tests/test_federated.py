import pytest
import numpy as np

from app.federated.clients.flower_client import MunicipalFlowerClient
from app.federated.clients.client_manager import get_client_registry
from app.federated.strategies.custom_fedavg import CustomFedAvgStrategy
from app.federated.server.flower_server import get_flower_server_manager
from app.federated.models.federated_model import InfrastructureDefectNet, get_model_parameters, set_model_parameters
from app.federated.utils.serialization import ndarrays_to_bytes, bytes_to_ndarrays
from app.models.models import RoleEnum

def test_federated_model_parameters():
    net = InfrastructureDefectNet(num_classes=4)
    params = get_model_parameters(net)
    assert len(params) > 0
    assert isinstance(params[0], np.ndarray)

    # Test serialization
    param_bytes = ndarrays_to_bytes(params)
    assert isinstance(param_bytes, bytes)
    reconstructed = bytes_to_ndarrays(param_bytes)
    assert len(reconstructed) == len(params)
    np.testing.assert_array_almost_equal(params[0], reconstructed[0])

def test_flower_client_fit_and_evaluate():
    client = MunicipalFlowerClient(client_id="muni_test_node", municipality_name="Test Municipality", num_samples=50)
    init_params = client.get_parameters()
    
    updated_params, num_samples, metrics = client.fit(
        parameters=init_params,
        config={"local_epochs": 1, "learning_rate": 0.01}
    )
    
    assert len(updated_params) == len(init_params)
    assert num_samples == 40
    assert "loss" in metrics
    assert metrics["municipality"] == "Test Municipality"

    loss, num_test_samples, eval_metrics = client.evaluate(updated_params, config={})
    assert num_test_samples == 10
    assert "accuracy" in eval_metrics

def test_custom_fedavg_aggregation():
    strategy = CustomFedAvgStrategy(min_fit_clients=2)
    net = InfrastructureDefectNet(num_classes=4)
    p1 = get_model_parameters(net)
    p2 = [p * 1.1 for p in p1]

    fit_results = [
        ("client_1", p1, 100, {"loss": 0.5, "accuracy": 0.80}),
        ("client_2", p2, 200, {"loss": 0.4, "accuracy": 0.85})
    ]

    agg_weights, summary = strategy.aggregate_fit(server_round=1, results=fit_results)
    assert agg_weights is not None
    assert summary["round"] == 1
    assert summary["participating_clients"] == 2
    assert summary["total_samples_trained"] == 300
    assert 0.0 < summary["global_accuracy"] <= 1.0

def test_flower_server_round_execution():
    server = get_flower_server_manager()
    res = server.start_training_round(num_rounds=2)
    assert res["status"] == "COMPLETED"
    assert res["rounds_executed"] == 2
    assert res["participating_clients_count"] >= 2
    assert "latest_global_accuracy" in res
    assert "convergence_rate_percent" in res

    status = server.get_server_status()
    assert status["registered_clients_count"] >= 4
    assert status["privacy_mode"] == "Decentralized (No Raw Data Transmission)"

def test_federated_api_endpoints_permissions(client, normal_user_token_headers, admin_user_token_headers):
    # Test unauthorized access with normal user token (should return 403 Forbidden)
    resp = client.get("/api/v1/federated/status", headers=normal_user_token_headers)
    assert resp.status_code == 403

    # Test authorized access with admin token (should return 200 OK)
    resp = client.get("/api/v1/federated/status", headers=admin_user_token_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["server_status"] in ["RUNNING", "TRAINING_ACTIVE"]

    resp = client.get("/api/v1/federated/clients", headers=admin_user_token_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 4

    # Trigger federated round via admin API
    resp = client.post("/api/v1/federated/rounds/start", json={"num_rounds": 1}, headers=admin_user_token_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "COMPLETED"
