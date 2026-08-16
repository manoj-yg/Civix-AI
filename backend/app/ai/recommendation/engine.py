import time
import logging
from typing import Dict, Any, Optional, List
from app.ai.recommendation.llm_provider import get_llm_provider, LLMProvider

logger = logging.getLogger("civix_backend")

class RecommendationService:
    """
    Unified AI Recommendation Engine.
    Synthesizes vision detection (YOLO), spatial segmentation (U-Net), tabular risk (XGBoost),
    and time-series forecasting (LSTM) with GIS location context & asset history to synthesize repair priorities.
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider or get_llm_provider()

    def generate_recommendation(
        self,
        yolo_results: Dict[str, Any],
        unet_results: Optional[Dict[str, Any]] = None,
        xgboost_results: Optional[Dict[str, Any]] = None,
        lstm_results: Optional[Dict[str, Any]] = None,
        gis_context: Optional[Dict[str, Any]] = None,
        asset_history: Optional[List[Dict[str, Any]]] = None,
        maintenance_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()

        detections = yolo_results.get("detections", [])
        total_defects = len(detections)
        defect_classes = list(set([d.get("class_name") for d in detections if d.get("class_name")]))

        severity_level = (xgboost_results or {}).get("severity_level", "LOW")
        risk_score = (xgboost_results or {}).get("risk_score", 0.0)

        deterioration_prob = (lstm_results or {}).get("deterioration_probability", 0.0)
        predicted_timeframe = (lstm_results or {}).get("estimated_maintenance_window", "30-60 days")

        damaged_area = (unet_results or {}).get("damaged_area", 0.0)

        location_desc = (gis_context or {}).get("address", (gis_context or {}).get("description", "Unknown Location"))
        ward = (gis_context or {}).get("ward", "N/A")

        # Determine Priority
        priority = severity_level

        # Synthesize Action, Reason, and Timeframe
        if severity_level == "CRITICAL":
            action = f"Emergency field dispatch required for urgent repair of {', '.join(defect_classes) or 'critical defects'}."
            reason = f"High severity risk score ({risk_score}/100) with severe area damage ({damaged_area} m²) near {location_desc}."
            suggested_timeframe = "Within 48 hours"
        elif severity_level == "HIGH":
            action = f"Schedule heavy patch repair and asphalt overlay for {', '.join(defect_classes) or 'defects'}."
            reason = f"Elevated risk score ({risk_score}/100) and deterioration probability of {int(deterioration_prob * 100)}%."
            suggested_timeframe = "Within 7 to 14 days"
        elif severity_level == "MEDIUM":
            action = f"Perform routine surface sealing and preventive crack fill."
            reason = f"Moderate defect density ({total_defects} defects detected) with stable degradation trend."
            suggested_timeframe = "Within 30 days"
        else:
            action = "Monitor during scheduled quarterly inspection cycle."
            reason = "Minor surface wear detected within acceptable municipal thresholds."
            suggested_timeframe = "Next regular cycle (90 days)"

        # Prepare RAG context prompt for optional LLM refinement
        rag_prompt = (
            f"Asset Location: {location_desc} (Ward: {ward})\n"
            f"Defects Detected: {', '.join(defect_classes)} (Total: {total_defects})\n"
            f"Damaged Surface Area: {damaged_area} m²\n"
            f"Risk Score: {risk_score} ({severity_level})\n"
            f"Forecasted Degradation Window: {predicted_timeframe}\n"
            f"Synthesize an engineering recommendation summary."
        )

        try:
            llm_summary = self.llm_provider.generate(
                prompt=rag_prompt,
                system_message="You are an expert civil engineer synthesizing infrastructure inspection recommendations."
            )
        except Exception as e:
            logger.warning(f"LLM provider prompt failed ({e}), using default rule-based action.")
            llm_summary = reason

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "recommended_action": action,
            "priority": priority,
            "reason": reason,
            "suggested_timeframe": suggested_timeframe,
            "llm_analysis": llm_summary,
            "inference_time_ms": elapsed_ms
        }
