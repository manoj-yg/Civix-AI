from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

class PredictionModel(ABC):
    """
    Abstract Interface for Time-Series Predictive Maintenance Models (LSTM, GRU, ARIMA, etc.)
    """

    @abstractmethod
    def load(self, model_path: Optional[str] = None) -> bool:
        """
        Load model weights into memory.
        """
        pass

    @abstractmethod
    def predict_maintenance(
        self,
        historical_records: List[Dict[str, Any]],
        current_severity: Dict[str, Any],
        asset_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predicts future asset degradation and recommended maintenance window.
        Returns standardized dict:
        {
            "model_name": str,
            "model_version": str,
            "inference_time_ms": float,
            "deterioration_probability": float (0.0 - 1.0),
            "predicted_future_severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            "estimated_maintenance_window": str,
            "is_development_mock": bool
        }
        """
        pass

    @abstractmethod
    def validate(self) -> bool:
        """
        Validates model state.
        """
        pass

    @abstractmethod
    def unload(self) -> None:
        """
        Unload model.
        """
        pass
