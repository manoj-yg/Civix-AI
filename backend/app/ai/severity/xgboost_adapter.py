import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.config import settings
from app.ai.severity.base import SeverityModel
from app.ai.severity.feature_engineering import FeatureExtractor

logger = logging.getLogger("civix_backend")

class XGBoostSeverityAdapter(SeverityModel):
    """
    XGBoost Model Adapter for Multi-Factor Infrastructure Risk & Defect Severity Prediction.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_name = "XGBoost_Infrastructure_Severity"
        self.model_version = "1.0.0"
        self.model_path = Path(model_path or settings.XGBOOST_MODEL_PATH or (Path(settings.MODELS_DIR) / "xgboost_severity.json"))
        self.model = None
        self._is_loaded = False
        self.is_mock = False
        self.feature_extractor = FeatureExtractor()

    def load(self, model_path: Optional[str] = None) -> bool:
        if model_path:
            self.model_path = Path(model_path)

        if not self.model_path.exists():
            logger.info(f"[DEVELOPMENT ONLY] XGBoost model file missing at {self.model_path}. Using fallback risk evaluation adapter.")
            self._is_loaded = True
            self.is_mock = True
            return True

        try:
            import xgboost as xgb
            self.model = xgb.Booster()
            self.model.load_model(str(self.model_path))
            self._is_loaded = True
            self.is_mock = False
            logger.info(f"Successfully loaded XGBoost severity model from {self.model_path}")
            return True
        except Exception as e:
            logger.warning(f"Failed to load XGBoost model ({e}). Using development fallback adapter.")
            self._is_loaded = True
            self.is_mock = True
            return True

    def predict_severity(self, feature_vector: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.perf_counter()

        total_defects = feature_vector.get("total_defects", 0)
        highest_weight = feature_vector.get("highest_defect_weight", 1.0)
        avg_conf = feature_vector.get("avg_confidence", 0.5)
        total_area = feature_vector.get("total_defect_area_sq_m", 0.0)
        infra_weight = feature_vector.get("infrastructure_weight", 1.0)
        traffic_mult = feature_vector.get("traffic_multiplier", 1.0)
        age = feature_vector.get("asset_age_years", 5.0)

        if not self.is_mock and self.model is not None:
            try:
                import xgboost as xgb
                import numpy as np
                # Construct feature matrix matching XGBoost signature
                raw_features = np.array([[
                    total_defects, highest_weight, avg_conf, total_area, infra_weight, traffic_mult, age
                ]])
                dmatrix = xgb.DMatrix(raw_features)
                raw_prediction = float(self.model.predict(dmatrix)[0])
                risk_score = round(min(100.0, max(0.0, raw_prediction * 10.0)), 2)
            except Exception as e:
                logger.error(f"Error during XGBoost inference ({e}), falling back to deterministic risk scoring.")
                risk_score = self._compute_deterministic_score(total_defects, highest_weight, avg_conf, total_area, infra_weight, traffic_mult, age)
        else:
            risk_score = self._compute_deterministic_score(total_defects, highest_weight, avg_conf, total_area, infra_weight, traffic_mult, age)

        # Categorize Severity Level
        if risk_score >= 75.0:
            severity_level = "CRITICAL"
        elif risk_score >= 50.0:
            severity_level = "HIGH"
        elif risk_score >= 25.0:
            severity_level = "MEDIUM"
        else:
            severity_level = "LOW"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "is_development_mock": self.is_mock,
            "inference_time_ms": elapsed_ms,
            "severity_level": severity_level,
            "risk_score": risk_score,
            "details": {
                "total_defects": total_defects,
                "infrastructure_type": feature_vector.get("infrastructure_type"),
                "traffic_level": feature_vector.get("traffic_level"),
                "highest_defect_weight": highest_weight,
                "asset_age_years": age
            }
        }

    def _compute_deterministic_score(self, total_defects: int, highest_weight: float, avg_conf: float, total_area: float, infra_weight: float, traffic_mult: float, age: float) -> float:
        if total_defects == 0:
            return 0.0

        base_score = highest_weight * avg_conf * 15.0
        defect_multiplier = 1.0 + (total_defects * 0.25)
        area_multiplier = 1.0 + min(2.0, total_area * 1.5)
        age_multiplier = 1.0 + min(0.5, age / 20.0)

        total_score = base_score * defect_multiplier * area_multiplier * infra_weight * traffic_mult * age_multiplier
        return round(min(100.0, max(0.0, total_score)), 2)

    def validate(self) -> bool:
        return self._is_loaded

    def unload(self) -> None:
        self.model = None
        self._is_loaded = False
