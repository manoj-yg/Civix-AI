from typing import Dict, Any, List
import numpy as np

def compute_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if len(y_true) == 0:
        return 0.0
    return float(np.mean(y_true == y_pred))

def calculate_convergence_rate(history_losses: List[float]) -> float:
    """Calculates percentage loss reduction over historical federated rounds."""
    if len(history_losses) < 2:
        return 0.0
    initial_loss = history_losses[0]
    latest_loss = history_losses[-1]
    if initial_loss == 0.0:
        return 0.0
    return round(max(0.0, (initial_loss - latest_loss) / initial_loss * 100.0), 2)
