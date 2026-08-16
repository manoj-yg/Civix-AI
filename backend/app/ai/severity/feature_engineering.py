from typing import Dict, Any, List, Optional

class FeatureExtractor:
    """
    Feature Engineering Layer for Infrastructure Severity Assessment.
    Encodes unstructured AI detections and contextual metadata into structured features.
    """

    INFRASTRUCTURE_WEIGHTS = {
        "BRIDGE": 1.5,
        "FLYOVER": 1.4,
        "ROAD": 1.0,
        "FOOTPATH": 0.8,
        "STREETLIGHT": 0.9
    }

    DEFECT_TYPE_SEVERITY_WEIGHTS = {
        "pothole": 4.0,
        "potholes": 4.0,
        "alligator crack": 3.2,
        "transverse crack": 2.2,
        "longitudinal crack": 1.8,
        "spalling": 3.5,
        "corrosion": 3.8,
        "exposed reinforcement": 4.5,
        "broken lamp": 2.0,
        "damaged pole": 3.5,
        "leaning pole": 3.8,
        "broken pavement": 2.5,
        "uneven surface": 1.5,
        "surface damage": 1.5,
        "structural surface damage": 3.2
    }

    TRAFFIC_LEVEL_WEIGHTS = {
        "LOW": 1.0,
        "MEDIUM": 1.25,
        "HIGH": 1.5,
        "HEAVY": 1.5
    }

    def extract_features(
        self,
        detections: List[Dict[str, Any]],
        segmentation: Optional[Dict[str, Any]] = None,
        infrastructure_type: str = "ROAD",
        asset_metadata: Optional[Dict[str, Any]] = None,
        environmental_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        asset_meta = asset_metadata or {}
        env_meta = environmental_context or {}

        infra_type_upper = str(infrastructure_type).upper()
        infra_weight = self.INFRASTRUCTURE_WEIGHTS.get(infra_type_upper, 1.0)

        total_defects = len(detections)
        max_confidence = max([d.get("confidence", 0.0) for d in detections], default=0.0)
        avg_confidence = round(sum([d.get("confidence", 0.0) for d in detections]) / max(1, total_defects), 4)

        total_defect_area_sq_m = sum([d.get("area_sq_m", 0.0) for d in detections])

        highest_defect_weight = 1.0
        defect_type_counts = {}
        for d in detections:
            c_name = str(d.get("class_name", "")).lower()
            defect_type_counts[c_name] = defect_type_counts.get(c_name, 0) + 1
            w = self.DEFECT_TYPE_SEVERITY_WEIGHTS.get(c_name, 1.0)
            if w > highest_defect_weight:
                highest_defect_weight = w

        seg_damaged_area = segmentation.get("damaged_area", 0.0) if segmentation else 0.0
        seg_crack_area = segmentation.get("crack_area", 0.0) if segmentation else 0.0
        seg_damage_ratio = segmentation.get("pixel_statistics", {}).get("damage_ratio", 0.0) if segmentation else 0.0

        # Physical measurements (if provided or estimated)
        crack_length = float(asset_meta.get("crack_length", round(seg_crack_area * 5.0, 2)))
        crack_width = float(asset_meta.get("crack_width", round(seg_crack_area * 0.5, 2)))
        pothole_depth = float(asset_meta.get("pothole_depth", 0.05 if "pothole" in defect_type_counts else 0.0))

        # Context features
        asset_age = float(asset_meta.get("asset_age_years", asset_meta.get("age", 5.0)))
        traffic_level = str(asset_meta.get("traffic_level", "MEDIUM")).upper()
        traffic_multiplier = self.TRAFFIC_LEVEL_WEIGHTS.get(traffic_level, 1.0)
        historical_defects = int(asset_meta.get("historical_defects_count", 0))

        rainfall_mm = float(env_meta.get("rainfall_mm", 0.0))
        temp_c = float(env_meta.get("temperature_c", 25.0))

        return {
            "infrastructure_type": infra_type_upper,
            "infrastructure_weight": infra_weight,
            "total_defects": total_defects,
            "max_confidence": max_confidence,
            "avg_confidence": avg_confidence,
            "total_defect_area_sq_m": round(total_defect_area_sq_m, 4),
            "highest_defect_weight": highest_defect_weight,
            "defect_type_counts": defect_type_counts,
            "segmentation_damaged_area": seg_damaged_area,
            "segmentation_crack_area": seg_crack_area,
            "segmentation_damage_ratio": seg_damage_ratio,
            "crack_length": crack_length,
            "crack_width": crack_width,
            "pothole_depth": pothole_depth,
            "asset_age_years": asset_age,
            "traffic_level": traffic_level,
            "traffic_multiplier": traffic_multiplier,
            "historical_defects_count": historical_defects,
            "rainfall_mm": rainfall_mm,
            "temperature_c": temp_c
        }
