import logging
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger("civix_backend")

class CustomFedAvgStrategy:
    """
    Extensible Federated Averaging Strategy (FedAvg).
    Aggregates parameter updates from municipal nodes, tracks round history,
    client participation, global accuracy, loss, and convergence rate.
    Designed for future DP-FedAvg and Secure Aggregation strategy extension.
    """

    def __init__(
        self,
        min_fit_clients: int = 2,
        min_evaluate_clients: int = 2,
        min_available_clients: int = 2
    ):
        self.min_fit_clients = min_fit_clients
        self.min_evaluate_clients = min_evaluate_clients
        self.min_available_clients = min_available_clients
        self.current_round = 0
        self.metrics_history: List[Dict[str, Any]] = []

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[str, List[np.ndarray], int, Dict[str, Any]]]
    ) -> Tuple[Optional[List[np.ndarray]], Dict[str, Any]]:
        """
        Aggregates local model parameters using weighted Federated Averaging (FedAvg).
        results: list of tuples (client_id, parameters, num_examples, metrics)
        """
        self.current_round = server_round
        if not results:
            return None, {}

        total_examples = sum([num_examples for _, _, num_examples, _ in results])
        if total_examples == 0:
            return None, {}

        # First client's parameter shape template
        num_layers = len(results[0][1])
        aggregated_weights = [np.zeros_like(w, dtype=np.float32) for w in results[0][1]]

        client_metrics = []
        for client_id, params, num_examples, metrics in results:
            weight_factor = num_examples / total_examples
            for i in range(num_layers):
                aggregated_weights[i] += params[i] * weight_factor
            client_metrics.append({
                "client_id": client_id,
                "num_examples": num_examples,
                "loss": metrics.get("loss", 0.0),
                "accuracy": metrics.get("accuracy", 0.0)
            })

        # Calculate weighted average loss and accuracy
        avg_loss = sum([m["loss"] * m["num_examples"] for m in client_metrics]) / max(1, total_examples)
        avg_acc = sum([m["accuracy"] * m["num_examples"] for m in client_metrics]) / max(1, total_examples)

        metrics_summary = {
            "round": server_round,
            "participating_clients": len(results),
            "total_samples_trained": total_examples,
            "global_loss": round(avg_loss, 4),
            "global_accuracy": round(avg_acc, 4),
            "local_metrics": client_metrics
        }
        self.metrics_history.append(metrics_summary)
        logger.info(f"[FL Round {server_round}] Aggregated {len(results)} clients. Global Loss: {avg_loss:.4f}, Accuracy: {avg_acc:.4f}")

        return aggregated_weights, metrics_summary
