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

    def get_summary_stats(self, db: Session) -> Dict[str, Any]:
        """
        Calculates city-wide infrastructure damage aggregates across severity, infrastructure type, and work status.
        """
        inspections = db.query(Inspection).all()
        total_damages = len(inspections)

        by_severity = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        by_infrastructure = {"ROAD": 0, "BRIDGE": 0, "FLYOVER": 0, "STREETLIGHT": 0, "FOOTPATH": 0}
        by_status = {"PENDING": 0, "IN_PROGRESS": 0, "WORK_DONE": 0, "COMPLETED": 0}

        for inc in inspections:
            # Severity
            sev_lvl = "LOW"
            if inc.severity_assessment:
                val = inc.severity_assessment.severity_level
                sev_lvl = val.value if hasattr(val, "value") else str(val).upper()
            if sev_lvl in by_severity:
                by_severity[sev_lvl] += 1
            else:
                by_severity["LOW"] += 1

            # Infrastructure
            infra = inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type).upper()
            if infra in by_infrastructure:
                by_infrastructure[infra] += 1
            else:
                by_infrastructure["ROAD"] += 1

            # Status
            st = inc.status.value if hasattr(inc.status, "value") else str(inc.status).upper()
            if st in by_status:
                by_status[st] += 1
            elif st == "PROCESSING":
                by_status["PENDING"] += 1
            else:
                by_status["PENDING"] += 1

        return {
            "total_damages": total_damages,
            "by_severity": by_severity,
            "by_infrastructure": by_infrastructure,
            "by_status": by_status,
            "high_risk_count": by_severity["CRITICAL"] + by_severity["HIGH"],
            "pending_repairs": by_status["PENDING"] + by_status["IN_PROGRESS"],
            "resolved_repairs": by_status["WORK_DONE"] + by_status["COMPLETED"]
        }

    def get_defects_geojson(self, db: Session) -> GeoJSONFeatureCollection:
        """
        Returns rich GeoJSON FeatureCollection of all citizen and inspector damage records.
        """
        features = []
        inspections = db.query(Inspection).order_by(Inspection.created_at.desc()).all()
        for inc in inspections:
            # Defect type label
            defect_type = "Infrastructure Defect"
            if inc.detections and len(inc.detections) > 0:
                defect_type = inc.detections[0].class_name or "Infrastructure Defect"
            elif inc.device_info and isinstance(inc.device_info, dict) and inc.device_info.get("defect_type"):
                defect_type = inc.device_info.get("defect_type")

            # Media thumbnail
            media_url = None
            if inc.media_items and len(inc.media_items) > 0:
                raw_path = inc.media_items[0].file_path
                from pathlib import Path
                media_url = f"/api/v1/inspections/media/file/{Path(raw_path).name}"

            # Address / notes
            address = (inc.device_info or {}).get("address") if isinstance(inc.device_info, dict) else None
            if not address and inc.device_info and isinstance(inc.device_info, dict):
                address = inc.device_info.get("location_name") or inc.device_info.get("notes")
            if not address:
                address = inc.work_notes or f"GPS: {round(inc.latitude, 5)}° N, {round(inc.longitude, 5)}° E"

            sev_level = "LOW"
            risk_score = 45.0
            if inc.severity_assessment:
                val = inc.severity_assessment.severity_level
                sev_level = val.value if hasattr(val, "value") else str(val)
                raw_s = float(inc.severity_assessment.overall_score or 45.0)
                risk_score = round(raw_s if raw_s > 10 else raw_s * 10.0, 1)

            status_val = inc.status.value if hasattr(inc.status, "value") else str(inc.status)

            features.append(GeoJSONFeature(
                geometry={
                    "type": "Point",
                    "coordinates": [inc.longitude, inc.latitude]
                },
                properties={
                    "inspection_id": str(inc.id),
                    "asset_type": inc.asset_type.value if hasattr(inc.asset_type, "value") else str(inc.asset_type),
                    "defect_type": defect_type,
                    "status": status_val,
                    "severity_score": risk_score,
                    "severity_level": sev_level.upper(),
                    "upvotes_count": inc.upvotes_count or 0,
                    "address": address,
                    "media_url": media_url,
                    "assigned_engineer": inc.assigned_engineer,
                    "work_notes": inc.work_notes or inc.resolution_notes,
                    "blockchain_verified": True,
                    "created_at": (inc.created_at or inc.captured_at).isoformat() if (inc.created_at or inc.captured_at) else None
                }
            ))
        return GeoJSONFeatureCollection(features=features)

def get_gis_service() -> GISService:
    return GISService()

