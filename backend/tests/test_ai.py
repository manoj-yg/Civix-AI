import io
import pytest
import numpy as np
from PIL import Image
from app.services.ai_service import get_ai_service, MODEL_PATH

def test_yolo_model_initialization():
    """Verify that YOLOv8 model weights exist and load properly into memory."""
    assert MODEL_PATH.exists(), f"YOLOv8 weights file not found at {MODEL_PATH}"
    ai_service = get_ai_service()
    assert ai_service.model is not None, "YOLOv8 model instance failed to load"

def test_yolo_inference_execution():
    """Verify running image inference on a synthetic image matrix."""
    ai_service = get_ai_service()
    # Create a 640x640 synthetic RGB image
    dummy_img = Image.new("RGB", (640, 640), color=(128, 128, 128))
    detections, severity, annotated = ai_service.run_image_inference(dummy_img, confidence=0.25)

    assert isinstance(detections, list)
    assert isinstance(severity, dict)
    assert "overall_score" in severity
    assert "severity_level" in severity
    assert isinstance(annotated, np.ndarray)

def test_health_check_model_loaded(client):
    """Verify health check endpoint reports model loaded status correctly."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert any(m in data["model_path"] for m in ["yolo26", "yolov11", "YOLOv8", "best.pt"])

def test_detect_image_endpoint(client):
    """Verify /api/detect/image endpoint handles uploaded image and returns detections and severity."""
    # Create dummy JPEG in memory
    buf = io.BytesIO()
    img = Image.new("RGB", (300, 300), color=(200, 200, 200))
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("test_road.jpg", buf, "image/jpeg")}
    resp = client.post("/api/detect/image", files=files, data={"confidence": "0.3"})
    assert resp.status_code == 200
    res = resp.json()
    assert "annotated_image" in res
    assert "detections" in res
    assert "severity" in res
    assert "location" in res
