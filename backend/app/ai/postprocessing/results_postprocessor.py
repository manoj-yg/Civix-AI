import time
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import cv2

logger = logging.getLogger("civix_backend")

class ResultsPostprocessor:
    """
    Postprocessing & Standardization Layer for AI Output Structuring.
    Formulates standard schema:
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
                "area_sq_m": float
            }
        ]
    }
    """

    def standardize_detection_output(
        self,
        raw_detections: List[Dict[str, Any]],
        model_name: str,
        model_version: str,
        inference_time_ms: float
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()

        formatted_detections = []
        for d in raw_detections:
            bbox = d.get("bbox", {})
            if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
                bbox_dict = {
                    "x1": float(bbox[0]),
                    "y1": float(bbox[1]),
                    "x2": float(bbox[2]),
                    "y2": float(bbox[3])
                }
            elif isinstance(bbox, dict):
                bbox_dict = {
                    "x1": float(bbox.get("x1", 0.0)),
                    "y1": float(bbox.get("y1", 0.0)),
                    "x2": float(bbox.get("x2", 0.0)),
                    "y2": float(bbox.get("x2", 0.0))
                }
            else:
                bbox_dict = {"x1": 0.0, "y1": 0.0, "x2": 0.0, "y2": 0.0}

            formatted_detections.append({
                "class_name": d.get("class_name", "Unknown"),
                "confidence": round(float(d.get("confidence", 0.0)), 4),
                "bbox": bbox_dict,
                "segmentation": d.get("segmentation"),
                "area_sq_m": d.get("area_sq_m")
            })

        postproc_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "model_name": model_name,
            "model_version": model_version,
            "inference_time_ms": inference_time_ms,
            "postprocessing_time_ms": postproc_time_ms,
            "detections": formatted_detections
        }

    def annotate_image(
        self,
        image_np: np.ndarray,
        detections: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Draws bounding box annotations and labels onto image numpy array.
        """
        annotated = image_np.copy()
        if len(annotated.shape) == 3 and annotated.shape[2] == 3:
            # OpenCV operates in BGR for drawing, convert if needed or draw directly
            pass

        for det in detections:
            bbox = det.get("bbox")
            if isinstance(bbox, dict):
                x1, y1 = int(bbox.get("x1", 0)), int(bbox.get("y1", 0))
                x2, y2 = int(bbox.get("x2", 0)), int(bbox.get("y2", 0))
            elif isinstance(bbox, (list, tuple)) and len(bbox) == 4:
                x1, y1, x2, y2 = [int(v) for v in bbox]
            else:
                continue

            label = f"{det.get('class_name', '')} {int(det.get('confidence', 0.0) * 100)}%"
            
            # Draw box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 0, 0), 2)
            
            # Draw label text
            cv2.putText(
                annotated,
                label,
                (x1, max(20, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                2
            )

        return annotated
