import logging
import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("civix_backend")

class ModelMetadata(BaseModel):
    model_name: str
    model_version: str
    framework: str # e.g. PyTorch, Ultralytics, ONNX, XGBoost, TensorFlow
    trained_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    metrics: Dict[str, Any] = Field(default_factory=dict)
    path_reference: str
    active_status: bool = True

DEFAULT_INFRASTRUCTURE_DEFECT_MAP: Dict[str, List[str]] = {
    "ROAD": [
        "pothole",
        "longitudinal crack",
        "transverse crack",
        "alligator crack",
        "surface damage"
    ],
    "BRIDGE": [
        "crack",
        "corrosion",
        "spalling",
        "exposed reinforcement"
    ],
    "FLYOVER": [
        "concrete crack",
        "spalling",
        "corrosion",
        "structural surface damage"
    ],
    "STREETLIGHT": [
        "broken lamp",
        "damaged pole",
        "leaning pole",
        "missing lamp"
    ],
    "FOOTPATH": [
        "broken pavement",
        "uneven surface",
        "missing tile",
        "obstruction"
    ]
}

# Mapping legacy / detected model class names to standard infrastructure defect taxonomies
DEFAULT_CLASS_NAME_CANONICAL_MAP: Dict[str, str] = {
    "Potholes": "pothole",
    "Pothole": "pothole",
    "Longitudinal Crack": "longitudinal crack",
    "Transverse Crack": "transverse crack",
    "Alligator Crack": "alligator crack",
    "Crack": "crack",
    "Concrete Crack": "concrete crack",
    "Spalling": "spalling",
    "Corrosion": "corrosion",
    "Exposed Reinforcement": "exposed reinforcement",
    "Broken Lamp": "broken lamp",
    "Damaged Pole": "damaged pole",
    "Leaning Pole": "leaning pole",
    "Missing Lamp": "missing lamp",
    "Broken Pavement": "broken pavement",
    "Uneven Surface": "uneven surface",
    "Missing Tile": "missing tile",
    "Obstruction": "obstruction",
    "Surface Damage": "surface damage",
    "Structural Surface Damage": "structural surface damage"
}

class ModelRegistry:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelRegistry, cls).__new__(cls)
            cls._instance._init_registry()
        return cls._instance

    def _init_registry(self):
        self._models: Dict[str, ModelMetadata] = {}
        self._instances: Dict[str, Any] = {}
        self._infrastructure_defect_map = DEFAULT_INFRASTRUCTURE_DEFECT_MAP.copy()
        self._canonical_class_map = DEFAULT_CLASS_NAME_CANONICAL_MAP.copy()
        
        # Register default metadata entries
        self.register_model_metadata(ModelMetadata(
            model_name="YOLOv8_Small_RDD",
            model_version="1.0.0",
            framework="Ultralytics YOLOv8",
            trained_at="2024-01-15T00:00:00Z",
            metrics={"mAP50": 0.782, "precision": 0.81, "recall": 0.76},
            path_reference="models/YOLOv8_Small_RDD.pt",
            active_status=True
        ))
        
        self.register_model_metadata(ModelMetadata(
            model_name="UNet_Defect_Segmentation",
            model_version="1.0.0",
            framework="PyTorch U-Net",
            trained_at="2024-03-10T00:00:00Z",
            metrics={"IoU": 0.84, "dice_coefficient": 0.89},
            path_reference="models/UNet_Defect_Segmentation.pth",
            active_status=True
        ))

        self.register_model_metadata(ModelMetadata(
            model_name="XGBoost_Infrastructure_Severity",
            model_version="1.0.0",
            framework="XGBoost",
            trained_at="2024-04-01T00:00:00Z",
            metrics={"f1_score": 0.87, "rmse": 0.12},
            path_reference="models/xgboost_severity.json",
            active_status=True
        ))

        self.register_model_metadata(ModelMetadata(
            model_name="LSTM_Predictive_Maintenance",
            model_version="1.0.0",
            framework="PyTorch LSTM",
            trained_at="2024-04-15T00:00:00Z",
            metrics={"mae": 0.05, "r2_score": 0.91},
            path_reference="models/lstm_maintenance.pt",
            active_status=True
        ))

    def register_model_metadata(self, metadata: ModelMetadata):
        self._models[metadata.model_name] = metadata
        logger.info(f"Registered model metadata: {metadata.model_name} (v{metadata.model_version})")

    def get_model_metadata(self, model_name: str) -> Optional[ModelMetadata]:
        return self._models.get(model_name)

    def list_registered_models(self) -> List[ModelMetadata]:
        return list(self._models.values())

    def store_instance(self, name: str, instance: Any):
        self._instances[name] = instance

    def get_instance(self, name: str) -> Optional[Any]:
        return self._instances.get(name)

    def remove_instance(self, name: str):
        if name in self._instances:
            del self._instances[name]

    def get_defect_taxonomy_for_asset(self, asset_type: str) -> List[str]:
        asset_type_upper = asset_type.upper()
        return self._infrastructure_defect_map.get(asset_type_upper, self._infrastructure_defect_map.get("ROAD", []))

    def canonicalize_class_name(self, class_name: str) -> str:
        return self._canonical_class_map.get(class_name, class_name.lower())

def get_model_registry() -> ModelRegistry:
    return ModelRegistry()
