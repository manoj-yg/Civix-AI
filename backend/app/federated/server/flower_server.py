import time
import logging
import datetime
from typing import Dict, Any, List, Optional

from app.federated.configuration.fl_config import get_federated_config, FederatedConfig
from app.federated.strategies.custom_fedavg import CustomFedAvgStrategy
from app.federated.clients.client_manager import get_client_registry, MunicipalClientRegistry
from app.federated.models.federated_model import InfrastructureDefectNet, get_model_parameters, set_model_parameters
from app.federated.evaluation.metrics import calculate_convergence_rate

logger = logging.getLogger("civix_backend")

class FlowerServerManager:
    """
    Central Federated Server Manager.
    Orchestrates federated learning rounds, parameter updates, convergence tracking,
    and global model persistence without accessing local raw inspection datasets.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FlowerServerManager, cls).__new__(cls)
            cls._instance._init_server()
        return cls._instance

    def _init_server(self):
        self.config: FederatedConfig = get_federated_config()
        self.client_registry: MunicipalClientRegistry = get_client_registry()
        self.strategy = CustomFedAvgStrategy(
            min_fit_clients=self.config.min_fit_clients,
            min_evaluate_clients=self.config.min_evaluate_clients,
            min_available_clients=self.config.min_available_clients
        )
        self.global_net = InfrastructureDefectNet(num_classes=4)
        self.global_parameters = get_model_parameters(self.global_net)
        
        self.current_round = 0
        self.is_training_active = False
        self.history_records: List[Dict[str, Any]] = []

    def start_training_round(self, num_rounds: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes one or more federated training rounds across registered municipal nodes.
        """
        rounds_to_run = num_rounds or self.config.num_rounds
        start_time = time.perf_counter()
        self.is_training_active = True

        clients = list(self.client_registry._clients.values())
        if len(clients) < self.config.min_fit_clients:
            self.is_training_active = False
            return {
                "status": "FAILED",
                "error": f"Insufficient registered municipal clients ({len(clients)} < {self.config.min_fit_clients})"
            }

        executed_rounds = []
        fit_config = {
            "local_epochs": self.config.local_epochs,
            "learning_rate": self.config.learning_rate
        }

        for r in range(1, rounds_to_run + 1):
            self.current_round += 1
            round_num = self.current_round

            # 1. Distribute global model parameters to participating municipal clients
            client_fit_results = []
            for client in clients:
                updated_params, num_samples, metrics = client.fit(self.global_parameters, fit_config)
                client_fit_results.append((client.client_id, updated_params, num_samples, metrics))

            # 2. Aggregate parameter updates using CustomFedAvg Strategy
            new_global_params, metrics_summary = self.strategy.aggregate_fit(round_num, client_fit_results)
            if new_global_params is not None:
                self.global_parameters = new_global_params
                set_model_parameters(self.global_net, new_global_params)

            metrics_summary["timestamp"] = datetime.datetime.utcnow().isoformat()
            self.history_records.append(metrics_summary)
            executed_rounds.append(metrics_summary)

        self.is_training_active = False
        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        history_losses = [h["global_loss"] for h in self.history_records]
        convergence_rate = calculate_convergence_rate(history_losses)

        return {
            "status": "COMPLETED",
            "rounds_executed": rounds_to_run,
            "current_round": self.current_round,
            "total_execution_time_ms": total_time_ms,
            "latest_global_accuracy": self.history_records[-1]["global_accuracy"] if self.history_records else 0.0,
            "latest_global_loss": self.history_records[-1]["global_loss"] if self.history_records else 0.0,
            "convergence_rate_percent": convergence_rate,
            "participating_clients_count": len(clients),
            "rounds_summary": executed_rounds
        }

    def get_server_status(self) -> Dict[str, Any]:
        history_losses = [h["global_loss"] for h in self.history_records]
        return {
            "server_status": "RUNNING" if not self.is_training_active else "TRAINING_ACTIVE",
            "flower_framework_version": "1.8.0",
            "current_round": self.current_round,
            "registered_clients_count": len(self.client_registry.list_clients()),
            "min_fit_clients_required": self.config.min_fit_clients,
            "latest_global_accuracy": self.history_records[-1]["global_accuracy"] if self.history_records else 0.0,
            "latest_global_loss": self.history_records[-1]["global_loss"] if self.history_records else 0.0,
            "convergence_rate_percent": calculate_convergence_rate(history_losses),
            "privacy_mode": "Decentralized (No Raw Data Transmission)"
        }

    def get_metrics_history(self) -> List[Dict[str, Any]]:
        return self.history_records

    def get_global_model_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": "CIVIX_Global_Defect_Classifier",
            "model_version": f"fl_v{self.current_round}.0",
            "framework": "PyTorch / Flower FL",
            "num_parameters_tensors": len(self.global_parameters),
            "current_round": self.current_round,
            "metrics": self.history_records[-1] if self.history_records else {}
        }

def get_flower_server_manager() -> FlowerServerManager:
    return FlowerServerManager()
