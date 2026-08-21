from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.schemas.gis import GeoJSONFeatureCollection, HeatmapPoint
from app.services.gis_service import get_gis_service, GISService

router = APIRouter(prefix="/gis", tags=["GIS & Mapping"])

@router.get("/nearby-defects", response_model=StandardResponse[List[Dict[str, Any]]])
def get_nearby_defects(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: float = Query(5000.0),
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    """
    Returns nearby inspection defect records within radius_meters of target GPS point.
    """
    nearby = gis_service.get_nearby_inspections(db, latitude, longitude, radius_meters)
    return StandardResponse(data=nearby)

@router.get("/high-risk-areas", response_model=StandardResponse[List[Dict[str, Any]]])
def get_high_risk_areas(
    min_risk_score: float = Query(50.0),
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    """
    Returns high-risk spatial clusters where defect risk score >= min_risk_score.
    """
    high_risk = gis_service.get_high_risk_areas(db, min_risk_score)
    return StandardResponse(data=high_risk)

@router.get("/defects-by-infrastructure", response_model=StandardResponse[Dict[str, List[Dict[str, Any]]]])
def get_defects_by_infrastructure(
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    """
    Groups defect inspection points by infrastructure asset type (ROAD, BRIDGE, FLYOVER, STREETLIGHT, FOOTPATH).
    """
    grouped = gis_service.get_defects_by_infrastructure(db)
    return StandardResponse(data=grouped)

@router.get("/severity-heatmap", response_model=StandardResponse[List[HeatmapPoint]])
@router.get("/heatmap", response_model=StandardResponse[List[HeatmapPoint]])
def get_severity_heatmap(
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    """
    Returns weighted GIS heatmap points weighted by defect severity risk score.
    """
    heatmap = gis_service.get_gis_heatmap(db)
    return StandardResponse(data=heatmap)

@router.get("/summary-stats", response_model=StandardResponse[Dict[str, Any]])
def get_gis_summary_stats(
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    """
    Returns city-wide aggregated damage metrics grouped by severity, infrastructure type, and status.
    """
    stats = gis_service.get_summary_stats(db)
    return StandardResponse(data=stats)

@router.get("/defects", response_model=StandardResponse[GeoJSONFeatureCollection])
def get_gis_defects(
    db: Session = Depends(get_db),
    gis_service: GISService = Depends(get_gis_service)
):
    """
    Returns GeoJSON FeatureCollection of defect points for map visualization.
    """
    geojson = gis_service.get_defects_geojson(db)
    return StandardResponse(data=geojson)

