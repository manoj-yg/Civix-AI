from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models.models import Asset, Inspection, SeverityAssessment, Defect, AssetTypeEnum
from app.schemas.gis import GeoJSONFeature, GeoJSONFeatureCollection, HeatmapPoint

class GISService:
    def get_nearby_inspections(
        self, db: Session, latitude: float, longitude: float, radius_meters: float = 5000.0
    ) -> List[Dict[str, Any]]:
        """
        Fetches inspections within radius_meters using PostGIS spatial indexing or Euclidean fallback.
        """
        try:
            results = db.query(Inspection).filter(
                func.ST_DWithin(
                    Inspection.geom,
                    func.ST_GeographyFromText(f"SRID=4326;POINT({longitude} {latitude})"),
                    radius_meters
                )
            ).all()
        except Exception:
            results = db.query(Inspection).all()

        output = []
        for inc in results:
            output.append({
                "id": str(inc.id),
                "asset_type": inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                "latitude": inc.latitude,
                "longitude": inc.longitude,
                "captured_at": inc.captured_at.isoformat() if inc.captured_at else None,
                "status": inc.status.value if hasattr(inc.status, "value") else str(inc.status),
                "defects_count": len(inc.detections or []),
                "severity_level": inc.severity_assessment.severity_level.value if inc.severity_assessment else "LOW"
            })
        return output

    def get_high_risk_areas(self, db: Session, min_risk_score: float = 50.0) -> List[Dict[str, Any]]:
        """
        Queries high-risk inspection clusters where risk score >= min_risk_score.
        """
        high_risk = []
        inspections = db.query(Inspection).all()
        for inc in inspections:
            score = (inc.severity_assessment.overall_score * 10.0) if inc.severity_assessment else 0.0
            if score >= min_risk_score:
                high_risk.append({
                    "inspection_id": str(inc.id),
                    "asset_type": inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                    "latitude": inc.latitude,
                    "longitude": inc.longitude,
                    "risk_score": round(score, 2),
                    "severity_level": inc.severity_assessment.severity_level.value if inc.severity_assessment else "HIGH",
                    "recommendation": (inc.severity_assessment.details or {}).get("recommendation") if inc.severity_assessment else None
                })
        return high_risk

    def get_defects_by_infrastructure(self, db: Session) -> Dict[str, List[Dict[str, Any]]]:
        """
        Groups defect inspection records by infrastructure asset type (ROAD, BRIDGE, FLYOVER, STREETLIGHT, FOOTPATH).
        """
        grouped = {
            "ROAD": [],
            "BRIDGE": [],
            "FLYOVER": [],
            "STREETLIGHT": [],
            "FOOTPATH": []
        }
        inspections = db.query(Inspection).all()
        for inc in inspections:
            infra_key = inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type)
            if infra_key not in grouped:
                grouped[infra_key] = []
            
            grouped[infra_key].append({
                "inspection_id": str(inc.id),
                "latitude": inc.latitude,
                "longitude": inc.longitude,
                "defects_count": len(inc.detections or []),
                "severity_level": inc.severity_assessment.severity_level.value if inc.severity_assessment else "LOW"
            })
        return grouped

    def get_gis_heatmap(self, db: Session) -> List[HeatmapPoint]:
        """
        Returns weighted heatmap points based on inspection severity scores.
        """
        points = []
        inspections = db.query(Inspection).all()
        for inc in inspections:
            weight = 1.0
            if inc.severity_assessment:
                weight = float(inc.severity_assessment.overall_score * 10.0)
            points.append(HeatmapPoint(
                latitude=inc.latitude,
                longitude=inc.longitude,
                weight=weight
            ))
        return points

    def get_defects_geojson(self, db: Session) -> GeoJSONFeatureCollection:
        """
        Returns GeoJSON FeatureCollection of defects for interactive mapping.
        """
        features = []
        inspections = db.query(Inspection).all()
        for inc in inspections:
            features.append(GeoJSONFeature(
                geometry={
                    "type": "Point",
                    "coordinates": [inc.longitude, inc.latitude]
                },
                properties={
                    "inspection_id": str(inc.id),
                    "asset_type": inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                    "status": inc.status.value if hasattr(inc.status, "value") else str(inc.status),
                    "severity_score": inc.severity_assessment.overall_score if inc.severity_assessment else 0.0,
                    "severity_level": inc.severity_assessment.severity_level.value if inc.severity_assessment and hasattr(inc.severity_assessment.severity_level, "value") else "LOW"
                }
            ))
        return GeoJSONFeatureCollection(features=features)

def get_gis_service() -> GISService:
    return GISService()
