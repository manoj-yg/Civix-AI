import time
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from app.ai.model_registry.registry import get_model_registry, ModelRegistry
from app.ai.preprocessing.image_preprocessor import ImagePreprocessor
from app.ai.postprocessing.results_postprocessor import ResultsPostprocessor
from app.ai.detection.yolov8_adapter import YOLOv8Adapter
from app.ai.detection.yolo_generic_adapter import YOLOGenericAdapter
from app.ai.segmentation.unet_adapter import UNetSegmentationAdapter
from app.ai.severity.feature_engineering import FeatureExtractor
from app.ai.severity.xgboost_adapter import XGBoostSeverityAdapter
from app.ai.prediction.lstm_adapter import LSTMPredictionAdapter
from app.ai.recommendation.engine import RecommendationService

logger = logging.getLogger("civix_backend")

class UnifiedAIPipeline:
    """
    End-to-End Multimodal AI Inspection Pipeline.
    Integrates Preprocessing -> YOLO Detection -> U-Net Segmentation -> Feature Extraction
    -> XGBoost Severity -> LSTM Forecasting -> AI Recommendation Engine with strict Failure Isolation.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(UnifiedAIPipeline, cls).__new__(cls)
            cls._instance._init_pipeline()
        return cls._instance

    def _init_pipeline(self):
        self.registry: ModelRegistry = get_model_registry()
        self.preprocessor = ImagePreprocessor()
        self.postprocessor = ResultsPostprocessor()
        self.feature_extractor = FeatureExtractor()

        # Initialize and register singletons for zero per-request reloading overhead
        self.yolo_model = YOLOv8Adapter()
        self.yolo_model.load()
        self.registry.store_instance("yolo", self.yolo_model)

        self.unet_model = UNetSegmentationAdapter()
        self.unet_model.load()
        self.registry.store_instance("unet", self.unet_model)

        self.severity_model = XGBoostSeverityAdapter()
        self.severity_model.load()
        self.registry.store_instance("severity", self.severity_model)

        self.prediction_model = LSTMPredictionAdapter()
        self.prediction_model.load()
        self.registry.store_instance("prediction", self.prediction_model)

        self.recommendation_engine = RecommendationService()

    def process_inspection(
        self,
        image_input: Any,
        confidence: float = 0.5,
        infrastructure_type: str = "ROAD",
        gis_context: Optional[Dict[str, Any]] = None,
        asset_history: Optional[List[Dict[str, Any]]] = None,
        maintenance_history: Optional[List[Dict[str, Any]]] = None,
        run_segmentation: bool = True
    ) -> Tuple[Dict[str, Any], np.ndarray]:
        """
        Executes the complete unified AI pipeline with stage-wise failure isolation.
        Returns: (pipeline_result_dict, annotated_image_np)
        """
        pipeline_start_time = time.perf_counter()
        
        # 1. Preprocessing Stage
        try:
            image_np, prep_meta = self.preprocessor.prepare_image(image_input)
            preprocessing_time_ms = prep_meta.get("preprocessing_time_ms", 0.0)
        except Exception as e:
            logger.error(f"Pipeline Preprocessing Failure: {e}")
            image_np = np.zeros((640, 640, 3), dtype=np.uint8) if not isinstance(image_input, np.ndarray) else image_input
            preprocessing_time_ms = 0.0

        # 2. YOLO Object Detection Stage (Failure Isolated)
        yolo_output = {
            "model_name": self.yolo_model.model_name,
            "model_version": self.yolo_model.model_version,
            "inference_time_ms": 0.0,
            "detections": []
        }
        try:
            yolo_output = self.yolo_model.predict(image_np, confidence=confidence)
        except Exception as e:
            logger.error(f"YOLO Detection Stage Failure: {e}")

        detections = yolo_output.get("detections", [])

        # 3. U-Net Segmentation Stage (Failure Isolated)
        unet_output = None
        if run_segmentation:
            try:
                unet_output = self.unet_model.predict(image_np, detections=detections)
            except Exception as e:
                logger.warning(f"U-Net Segmentation Stage Failure: {e}")
                unet_output = {
                    "model_name": self.unet_model.model_name,
                    "model_version": self.unet_model.model_version,
                    "inference_time_ms": 0.0,
                    "damaged_area": 0.0,
                    "crack_area": 0.0,
                    "pixel_statistics": {"total_pixels": 0, "damaged_pixels": 0, "crack_pixels": 0, "damage_ratio": 0.0}
                }

        # 4. Feature Extraction Stage (Failure Isolated)
        try:
            feature_vector = self.feature_extractor.extract_features(
                detections=detections,
                segmentation=unet_output,
                infrastructure_type=infrastructure_type,
                asset_metadata={"historical_defects_count": len(asset_history or [])},
                environmental_context=gis_context
            )
        except Exception as e:
            logger.error(f"Feature Extraction Stage Failure: {e}")
            feature_vector = {"total_defects": len(detections), "infrastructure_type": infrastructure_type}

        # 5. XGBoost Severity Prediction Stage (Failure Isolated)
        try:
            severity_output = self.severity_model.predict_severity(feature_vector)
        except Exception as e:
            logger.error(f"XGBoost Severity Stage Failure: {e}")
            severity_output = {
                "model_name": self.severity_model.model_name,
                "model_version": self.severity_model.model_version,
                "severity_level": "LOW",
                "risk_score": 0.0,
                "details": {}
            }

        # 6. LSTM Predictive Maintenance Stage (Failure Isolated)
        try:
            prediction_output = self.prediction_model.predict_maintenance(
                historical_records=asset_history or [],
                current_severity=severity_output,
                asset_info={"infrastructure_type": infrastructure_type}
            )
        except Exception as e:
            logger.warning(f"LSTM Predictive Stage Failure: {e}")
            prediction_output = {
                "model_name": self.prediction_model.model_name,
                "model_version": self.prediction_model.model_version,
                "deterioration_probability": 0.0,
                "predicted_future_severity": "LOW",
                "estimated_maintenance_window": "90-180 days"
            }

        # 7. Recommendation Engine Stage (Failure Isolated)
        try:
            recommendation_output = self.recommendation_engine.generate_recommendation(
                yolo_results=yolo_output,
                unet_results=unet_output,
                xgboost_results=severity_output,
                lstm_results=prediction_output,
                gis_context=gis_context,
                asset_history=asset_history,
                maintenance_history=maintenance_history
            )
        except Exception as e:
            logger.error(f"Recommendation Engine Failure: {e}")
            recommendation_output = {
                "recommended_action": "Routine quarterly inspection.",
                "priority": "LOW",
                "reason": "Default fallback recommendation.",
                "suggested_timeframe": "90 days"
            }

        # 8. Postprocessing & Annotation Stage
        try:
            annotated_np = self.postprocessor.annotate_image(image_np, detections)
            postproc_meta = self.postprocessor.standardize_detection_output(
                raw_detections=detections,
                model_name=yolo_output.get("model_name", "YOLOv8_Small_RDD"),
                model_version=yolo_output.get("model_version", "1.0.0"),
                inference_time_ms=yolo_output.get("inference_time_ms", 0.0)
            )
            postprocessing_time_ms = postproc_meta.get("postprocessing_time_ms", 0.0)
        except Exception as e:
            logger.error(f"Postprocessing Failure: {e}")
            annotated_np = image_np.copy()
            postprocessing_time_ms = 0.0

        total_pipeline_time_ms = round((time.perf_counter() - pipeline_start_time) * 1000, 2)

        # Assemble Standardized Result Payload
        result = {
            "pipeline_version": "2.0.0",
            "infrastructure_type": infrastructure_type,
            "performance_metrics": {
                "preprocessing_time_ms": preprocessing_time_ms,
                "yolo_inference_time_ms": yolo_output.get("inference_time_ms", 0.0),
                "unet_inference_time_ms": unet_output.get("inference_time_ms", 0.0) if unet_output else 0.0,
                "xgboost_inference_time_ms": severity_output.get("inference_time_ms", 0.0),
                "lstm_inference_time_ms": prediction_output.get("inference_time_ms", 0.0),
                "postprocessing_time_ms": postprocessing_time_ms,
                "total_pipeline_time_ms": total_pipeline_time_ms
            },
            "detection": yolo_output,
            "segmentation": unet_output,
            "severity_assessment": {
                "model_name": severity_output.get("model_name"),
                "model_version": severity_output.get("model_version"),
                "overall_score": severity_output.get("risk_score", 0.0) / 10.0, # normalized 0-10 scale for backward compatibility
                "risk_score": severity_output.get("risk_score", 0.0),
                "severity_level": severity_output.get("severity_level", "LOW"),
                "details": severity_output.get("details", {})
            },
            "predictive_maintenance": prediction_output,
            "recommendation": recommendation_output
        }

        return result, annotated_np

def get_unified_pipeline() -> UnifiedAIPipeline:
    return UnifiedAIPipeline()
