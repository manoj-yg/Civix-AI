from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class DetectionModel(ABC):
    """
    Abstract Interface for Object Detection Models (YOLOv8, YOLOv11, Custom, etc.)
    """

    @abstractmethod
    def load(self, model_path: Optional[str] = None) -> bool:
        """
        Load model weights into memory.
        """
        pass

    @abstractmethod
    def predict(self, image: Any, confidence: float = 0.5) -> Dict[str, Any]:
        """
        Runs object detection inference on an image.
        Returns standardized dict:
        {
            "model_name": str,
            "model_version": str,
            "inference_time_ms": float,
            "detections": [
                {
                    "class_name": str,
                    "confidence": float,
                    "bbox": {"x1": float, "y1": float, "x2": float, "y2": float},
                    "segmentation": Optional[dict],
                    "area_sq_m": Optional[float]
                }
            ]
        }
        """
        pass

    @abstractmethod
    def validate(self) -> bool:
        """
        Validates model state and operational health.
        """
        pass

    @abstractmethod
    def unload(self) -> None:
        """
        Unload model weights to release GPU/CPU memory.
        """
        pass
