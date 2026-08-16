from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class SeverityModel(ABC):
    """
    Abstract Interface for Risk & Severity Assessment Models (XGBoost, Random Forest, etc.)
    """

    @abstractmethod
    def load(self, model_path: Optional[str] = None) -> bool:
        """
        Load model weights into memory.
        """
        pass

    @abstractmethod
    def predict_severity(self, feature_vector: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predicts severity level and risk score based on engineered feature vector.
        Returns standardized dict:
        {
            "model_name": str,
            "model_version": str,
            "inference_time_ms": float,
            "severity_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            "risk_score": float (0-100),
            "details": Dict[str, Any],
            "is_development_mock": bool
        }
        """
        pass

    @abstractmethod
    def validate(self) -> bool:
        """
        Validates model operational state.
        """
        pass

    @abstractmethod
    def unload(self) -> None:
        """
        Unload model.
        """
        pass
