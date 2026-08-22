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
        detections: List[Dict[str, Any]],
        location_text: Optional[str] = None
    ) -> np.ndarray:
        """
        Draws high-visibility bounding box annotations, defect badges, and HUD overlays onto image numpy array.
        """
        annotated = image_np.copy()
        h, w = annotated.shape[:2]

        # Overlay layer for semi-transparent defect mask
        overlay = annotated.copy()

        for det in detections:
            bbox = det.get("bbox")
            if isinstance(bbox, dict):
                x1, y1 = int(bbox.get("x1", 0)), int(bbox.get("y1", 0))
                x2, y2 = int(bbox.get("x2", w)), int(bbox.get("y2", h))
            elif isinstance(bbox, (list, tuple)) and len(bbox) == 4:
                x1, y1, x2, y2 = [int(v) for v in bbox]
            else:
                continue

            # Constrain to image dimensions
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w - 1, x2), min(h - 1, y2)
            if x2 <= x1 or y2 <= y1:
                continue

            class_name = det.get("class_name", "Pothole").capitalize()
            conf_pct = int(det.get("confidence", 0.85) * 100)
            label = f" {class_name} ({conf_pct}%) "

            # Semi-transparent red highlight fill inside the defect bounding box
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 239), -1)

            # High-visibility red outer rectangle
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 239), 3)

            # Glowing corner accents
            corner_len = min(20, (x2 - x1) // 3, (y2 - y1) // 3)
            if corner_len > 4:
                # Top-Left
                cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), (0, 255, 255), 4)
                cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), (0, 255, 255), 4)
                # Top-Right
                cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), (0, 255, 255), 4)
                cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), (0, 255, 255), 4)
                # Bottom-Left
                cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), (0, 255, 255), 4)
                cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), (0, 255, 255), 4)
                # Bottom-Right
                cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), (0, 255, 255), 4)
                cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), (0, 255, 255), 4)

            # Draw Label Tag Banner
            font_scale = 0.55
            font_thickness = 2
            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)
            
            banner_y1 = max(0, y1 - text_h - 10)
            banner_y2 = max(text_h + 10, y1)
            banner_x2 = min(w - 1, x1 + text_w + 10)

            # Background pill for defect label
            cv2.rectangle(annotated, (x1, banner_y1), (banner_x2, banner_y2), (0, 0, 239), -1)
            # White text
            cv2.putText(
                annotated,
                label,
                (x1 + 4, banner_y2 - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                font_thickness,
                cv2.LINE_AA
            )

        # Blend semi-transparent overlay
        cv2.addWeighted(overlay, 0.20, annotated, 0.80, 0, annotated)

        # Add HUD watermark header badge
        hud_label = " CIVIX-AI: YOLO NEURAL DEFECT DETECTED "
        (hw, hh), _ = cv2.getTextSize(hud_label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(annotated, (10, 10), (10 + hw + 10, 10 + hh + 12), (0, 0, 0), -1)
        cv2.putText(annotated, hud_label, (15, 10 + hh + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 128), 1, cv2.LINE_AA)

        if location_text:
            loc_str = f" {location_text[:50]} "
            (lw, lh), _ = cv2.getTextSize(loc_str, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
            cv2.rectangle(annotated, (10, h - lh - 20), (10 + lw + 10, h - 8), (0, 0, 0), -1)
            cv2.putText(annotated, loc_str, (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1, cv2.LINE_AA)

        return annotated
