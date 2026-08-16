import io
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image

from app.core.config import ROOT_DIR
from app.ai.pipelines.unified_pipeline import get_unified_pipeline

logger = logging.getLogger("civix_backend")

MODELS_DIR = ROOT_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_URL = "https://github.com/oracl4/RoadDamageDetection/raw/main/models/YOLOv8_Small_RDD.pt"
MODEL_PATH = MODELS_DIR / "YOLOv8_Small_RDD.pt"

CLASSES = [
    "Longitudinal Crack",
    "Transverse Crack",
    "Alligator Crack",
    "Potholes"
]

DAMAGE_WEIGHTS = {
    "Potholes": 4.0,
    "Alligator Crack": 3.0,
    "Transverse Crack": 2.0,
    "Longitudinal Crack": 1.5
}

class AIService:
    """
    Backward Compatible AI Service Wrapper.
    Delegates to UnifiedAIPipeline while maintaining legacy method signatures and schemas.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        self.pipeline = get_unified_pipeline()

    @property
    def model(self):
        """
        Exposes underlying YOLO model instance for health check & backward compatibility verification.
        """
        return getattr(self.pipeline.yolo_model, "model", None)

    def run_image_inference(self, image_input: Any, confidence: float = 0.5) -> Tuple[List[Dict[str, Any]], Dict[str, Any], np.ndarray]:
        """
        Runs complete AI inspection pipeline and maps results to legacy tuple schema:
        (detections, severity_assessment, annotated_numpy_array)
        """
        result, annotated_np = self.pipeline.process_inspection(image_input, confidence=confidence)

        raw_dets = result.get("detection", {}).get("detections", [])
        detections = []
        for d in raw_dets:
            cls_name = d.get("class_name", "Unknown")
            cls_id = CLASSES.index(cls_name) if cls_name in CLASSES else 0
            bbox_dict = d.get("bbox", {})
            if isinstance(bbox_dict, dict):
                bbox_list = [
                    round(float(bbox_dict.get("x1", 0.0)), 2),
                    round(float(bbox_dict.get("y1", 0.0)), 2),
                    round(float(bbox_dict.get("x2", 0.0)), 2),
                    round(float(bbox_dict.get("y2", 0.0)), 2)
                ]
            else:
                bbox_list = list(bbox_dict) if isinstance(bbox_dict, (list, tuple)) else [0.0, 0.0, 0.0, 0.0]

            detections.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": d.get("confidence", 0.0),
                "bbox": bbox_list,
                "area_sq_m": d.get("area_sq_m", 0.0)
            })

        sev_data = result.get("severity_assessment", {})
        severity_assessment = {
            "overall_score": sev_data.get("overall_score", 0.0),
            "severity_level": sev_data.get("severity_level", "LOW"),
            "details": {
                "total_defects": len(detections),
                "damage_classes": list(set(d["class_name"] for d in detections)),
                "risk_score": sev_data.get("risk_score", 0.0),
                "recommendation": result.get("recommendation", {}).get("recommended_action")
            }
        }

        return detections, severity_assessment, annotated_np

def get_ai_service() -> AIService:
    return AIService()
