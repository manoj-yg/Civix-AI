import pytest
import numpy as np
from PIL import Image

from app.ai.model_registry.registry import get_model_registry, ModelMetadata
from app.ai.detection.yolov8_adapter import YOLOv8Adapter
from app.ai.detection.yolo_generic_adapter import YOLOGenericAdapter
from app.ai.segmentation.unet_adapter import UNetSegmentationAdapter
from app.ai.severity.feature_engineering import FeatureExtractor
from app.ai.severity.xgboost_adapter import XGBoostSeverityAdapter
from app.ai.prediction.lstm_adapter import LSTMPredictionAdapter
from app.ai.recommendation.llm_provider import get_llm_provider, MockLLMProvider
from app.ai.recommendation.engine import RecommendationService
from app.ai.pipelines.unified_pipeline import get_unified_pipeline

def test_model_registry():
    registry = get_model_registry()
    models = registry.list_registered_models()
    assert len(models) >= 4
    
    yolo_meta = registry.get_model_metadata("YOLOv8_Small_RDD")
    assert yolo_meta is not None
    assert yolo_meta.model_version == "1.0.0"
    
    # Test infrastructure taxonomy mapping
    bridge_defects = registry.get_defect_taxonomy_for_asset("BRIDGE")
    assert "corrosion" in bridge_defects
    assert "spalling" in bridge_defects

def test_yolo_adapters():
    yolo8 = YOLOv8Adapter()
    assert yolo8.model_name == "YOLOv8_Small_RDD"
    
    dummy_img = Image.new("RGB", (300, 300), color=(100, 100, 100))
    res8 = yolo8.predict(dummy_img)
    assert "model_name" in res8
    assert "detections" in res8
    assert isinstance(res8["inference_time_ms"], float)

    generic_yolo = YOLOGenericAdapter(model_name="YOLO_Upgraded", class_names=["pothole", "spalling"])
    res_gen = generic_yolo.predict(dummy_img)
    assert res_gen["model_name"] == "YOLO_Upgraded"

def test_unet_segmentation_adapter():
    unet = UNetSegmentationAdapter()
    unet.load()
    dummy_img = Image.new("RGB", (400, 400), color=(150, 150, 150))
    mock_detections = [
        {"class_name": "Potholes", "bbox": {"x1": 50, "y1": 50, "x2": 150, "y2": 150}},
        {"class_name": "Longitudinal Crack", "bbox": {"x1": 200, "y1": 200, "x2": 250, "y2": 300}}
    ]
    seg_res = unet.predict(dummy_img, detections=mock_detections)
    assert "damaged_area" in seg_res
    assert "crack_area" in seg_res
    assert "pixel_statistics" in seg_res
    assert seg_res["pixel_statistics"]["total_pixels"] == 160000

def test_feature_engineering_and_xgboost_severity():
    extractor = FeatureExtractor()
    mock_detections = [
        {"class_name": "Potholes", "confidence": 0.88, "bbox": {"x1": 10, "y1": 10, "x2": 100, "y2": 100}, "area_sq_m": 0.25}
    ]
    features = extractor.extract_features(
        detections=mock_detections,
        infrastructure_type="BRIDGE",
        asset_metadata={"asset_age_years": 10, "traffic_level": "HIGH"}
    )
    assert features["infrastructure_type"] == "BRIDGE"
    assert features["traffic_multiplier"] == 1.5

    xgb_adapter = XGBoostSeverityAdapter()
    xgb_adapter.load()
    sev_res = xgb_adapter.predict_severity(features)
    assert "severity_level" in sev_res
    assert "risk_score" in sev_res
    assert 0.0 <= sev_res["risk_score"] <= 100.0

def test_lstm_predictive_maintenance():
    lstm = LSTMPredictionAdapter()
    lstm.load()
    pred_res = lstm.predict_maintenance(
        historical_records=[{"severity_score": 3.0}, {"severity_score": 4.5}],
        current_severity={"risk_score": 65.0},
        asset_info={"asset_age_years": 8, "traffic_level": "HIGH"}
    )
    assert "deterioration_probability" in pred_res
    assert "predicted_future_severity" in pred_res
    assert "estimated_maintenance_window" in pred_res
    assert 0.0 <= pred_res["deterioration_probability"] <= 1.0

def test_recommendation_engine_and_llm_provider():
    llm = get_llm_provider("mock")
    assert isinstance(llm, MockLLMProvider)

    rec_service = RecommendationService(llm_provider=llm)
    rec_res = rec_service.generate_recommendation(
        yolo_results={"detections": [{"class_name": "Potholes"}]},
        xgboost_results={"severity_level": "HIGH", "risk_score": 68.5},
        gis_context={"address": "MG Road, Bengaluru", "ward": "Ward 80"}
    )
    assert rec_res["priority"] == "HIGH"
    assert "recommended_action" in rec_res
    assert "suggested_timeframe" in rec_res
    assert "[MOCK LLM RESPONSE]" in rec_res["llm_analysis"]

def test_unified_ai_pipeline_orchestration():
    pipeline = get_unified_pipeline()
    dummy_img = Image.new("RGB", (640, 640), color=(128, 128, 128))
    
    result, annotated_np = pipeline.process_inspection(
        image_input=dummy_img,
        confidence=0.3,
        infrastructure_type="ROAD",
        gis_context={"address": "Test Location", "ward": "Test Ward"}
    )
    
    assert result["pipeline_version"] == "2.0.0"
    assert result["infrastructure_type"] == "ROAD"
    assert "performance_metrics" in result
    assert "detection" in result
    assert "segmentation" in result
    assert "severity_assessment" in result
    assert "predictive_maintenance" in result
    assert "recommendation" in result
    assert isinstance(annotated_np, np.ndarray)
