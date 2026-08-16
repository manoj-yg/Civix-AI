from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class SegmentationModel(ABC):
    """
    Abstract Interface for Image & Defect Segmentation Models (U-Net, SegFormer, etc.)
    """

    @abstractmethod
    def load(self, model_path: Optional[str] = None) -> bool:
        """
        Load segmentation weights into memory.
        """
        pass

    @abstractmethod
    def predict(self, image: Any, detections: Optional[list] = None) -> Dict[str, Any]:
        """
        Runs segmentation inference on image and detected region bounding boxes.
        Returns standardized dict:
        {
            "model_name": str,
            "model_version": str,
            "inference_time_ms": float,
            "mask": Optional[Any], # numpy array or base64 or mask summary
            "damaged_area": float, # sq meters
            "crack_area": float, # sq meters
            "pixel_statistics": {
                "total_pixels": int,
                "damaged_pixels": int,
                "crack_pixels": int,
                "damage_ratio": float
            }
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
        Unload model weights.
        """
        pass
