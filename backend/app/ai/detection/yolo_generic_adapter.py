import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
from PIL import Image

from app.core.config import settings
from app.ai.detection.base import DetectionModel

logger = logging.getLogger("civix_backend")

class YOLOGenericAdapter(DetectionModel):
    """
    Configurable Model Adapter for upgraded YOLO models (e.g. YOLOv11, YOLOv9, Custom RDD).
    Supports configuration-driven paths and class maps.
    """

    def __init__(
        self,
        model_name: str = "YOLO_Upgraded_Infrastructure",
        model_version: str = "2.0.0",
        model_path: Optional[str] = None,
        class_names: Optional[List[str]] = None
    ):
        self.model_name = model_name
        self.model_version = model_version
        self.model_path = Path(model_path or settings.YOLO_UPGRADED_MODEL_PATH or settings.YOLO_DEFAULT_MODEL_PATH)
        self.class_names = class_names or [
            "pothole", "longitudinal crack", "transverse crack", "alligator crack", "surface damage",
            "spalling", "corrosion", "exposed reinforcement", "broken lamp", "damaged pole", "broken pavement"
        ]
        self.model = None
        self._is_loaded = False

    def load(self, model_path: Optional[str] = None) -> bool:
        if model_path:
            self.model_path = Path(model_path)

        if not self.model_path.exists():
            logger.warning(f"Upgraded YOLO model file missing at {self.model_path}. Will use mock/fallback mode.")
            self._is_loaded = False
            return False

        try:
            from ultralytics import YOLO
            self.model = YOLO(str(self.model_path))
            self._is_loaded = True
            logger.info(f"Loaded generic YOLO model '{self.model_name}' v{self.model_version} from {self.model_path}")
            return True
        except Exception as e:
            logger.error(f"Error loading model {self.model_name}: {e}")
            self.model = None
            self._is_loaded = False
            return False

    def predict(self, image: Any, confidence: float = 0.5) -> Dict[str, Any]:
        start_time = time.perf_counter()

        if isinstance(image, np.ndarray):
            img_np = image
        elif isinstance(image, Image.Image):
            img_np = np.array(image.convert("RGB"))
        else:
            raise ValueError("Unsupported image input type for YOLOGenericAdapter")

        height, width = img_np.shape[:2]
        frame_area = max(1, width * height)

        detections = []
        if self._is_loaded and self.model is not None:
            results = self.model(img_np, conf=confidence)
            if len(results) > 0 and len(results[0].boxes) > 0:
                boxes = results[0].boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = self.class_names[cls_id] if cls_id < len(self.class_names) else f"Class_{cls_id}"
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()

                    box_w = max(0.0, xyxy[2] - xyxy[0])
                    box_h = max(0.0, xyxy[3] - xyxy[1])
                    box_area = box_w * box_h
                    area_sq_m = round((box_area / frame_area) * 2.0, 3)

                    detections.append({
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": round(conf, 4),
                        "bbox": {
                            "x1": round(xyxy[0], 2),
                            "y1": round(xyxy[1], 2),
                            "x2": round(xyxy[2], 2),
                            "y2": round(xyxy[3], 2)
                        },
                        "segmentation": None,
                        "area_sq_m": area_sq_m
                    })

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "inference_time_ms": elapsed_ms,
            "detections": detections
        }

    def validate(self) -> bool:
        return self._is_loaded and self.model is not None

    def unload(self) -> None:
        self.model = None
        self._is_loaded = False
