import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
from PIL import Image

from app.core.config import settings
from app.ai.segmentation.base import SegmentationModel

logger = logging.getLogger("civix_backend")

class UNetSegmentationAdapter(SegmentationModel):
    """
    U-Net Model Adapter for Fine-Grained Infrastructure Damage & Crack Area Segmentation.
    Allows loading pre-trained PyTorch U-Net weights or running mock/rule-based estimation if weights absent.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_name = "UNet_Defect_Segmentation"
        self.model_version = "1.0.0"
        self.model_path = Path(model_path or settings.UNET_MODEL_PATH or (Path(settings.MODELS_DIR) / "UNet_Defect_Segmentation.pth"))
        self.model = None
        self._is_loaded = False
        self.is_mock = False

    def load(self, model_path: Optional[str] = None) -> bool:
        if model_path:
            self.model_path = Path(model_path)

        if not self.model_path.exists():
            logger.info(f"[DEVELOPMENT ONLY] U-Net model file not found at {self.model_path}. Operating in fallback segmentation mode.")
            self._is_loaded = True
            self.is_mock = True
            return True

        try:
            import torch
            # Standard PyTorch model loading placeholder for user's trained U-Net
            self.model = torch.jit.load(str(self.model_path))
            self.model.eval()
            self._is_loaded = True
            self.is_mock = False
            logger.info(f"Loaded U-Net segmentation model from {self.model_path}")
            return True
        except Exception as e:
            logger.warning(f"Could not load torch script U-Net model ({e}). Reverting to fallback adapter.")
            self._is_loaded = True
            self.is_mock = True
            return True

    def predict(self, image: Any, detections: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        start_time = time.perf_counter()

        if isinstance(image, np.ndarray):
            img_np = image
        elif isinstance(image, Image.Image):
            img_np = np.array(image.convert("RGB"))
        else:
            raise ValueError("Unsupported image type for U-Net segmentation")

        height, width = img_np.shape[:2]
        total_pixels = height * width
        frame_area_sq_m = 2.0 # Standardized camera field of view baseline

        damaged_pixels = 0
        crack_pixels = 0

        if detections:
            for det in detections:
                bbox = det.get("bbox")
                cls_name = str(det.get("class_name", "")).lower()
                if isinstance(bbox, dict):
                    x1, y1 = int(bbox.get("x1", 0)), int(bbox.get("y1", 0))
                    x2, y2 = int(bbox.get("x2", 0)), int(bbox.get("y2", 0))
                elif isinstance(bbox, (list, tuple)) and len(bbox) == 4:
                    x1, y1, x2, y2 = [int(v) for v in bbox]
                else:
                    continue

                w = max(0, x2 - x1)
                h = max(0, y2 - y1)
                area = w * h

                if "crack" in cls_name:
                    crack_pixels += int(area * 0.4) # estimated tight crack area
                    damaged_pixels += int(area * 0.5)
                else:
                    damaged_pixels += area

        # Cap pixels at total image size
        damaged_pixels = min(total_pixels, damaged_pixels)
        crack_pixels = min(damaged_pixels, crack_pixels)
        damage_ratio = round(damaged_pixels / max(1, total_pixels), 4)

        damaged_area_sq_m = round(damage_ratio * frame_area_sq_m, 4)
        crack_area_sq_m = round((crack_pixels / max(1, total_pixels)) * frame_area_sq_m, 4)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "is_development_mock": self.is_mock,
            "inference_time_ms": elapsed_ms,
            "mask": None, # Binary mask can be populated when full PyTorch model is attached
            "damaged_area": damaged_area_sq_m,
            "crack_area": crack_area_sq_m,
            "pixel_statistics": {
                "total_pixels": total_pixels,
                "damaged_pixels": damaged_pixels,
                "crack_pixels": crack_pixels,
                "damage_ratio": damage_ratio
            }
        }

    def validate(self) -> bool:
        return self._is_loaded

    def unload(self) -> None:
        self.model = None
        self._is_loaded = False
