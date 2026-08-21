import io
import json
import base64
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, File, UploadFile, Form, WebSocket, WebSocketDisconnect, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, Response, JSONResponse
from pydantic import BaseModel

from app.core.config import ROOT_DIR, settings
from app.services.ai_service import get_ai_service, CLASSES, MODEL_PATH
import sample_utils.db as db_module
from sample_utils.geo_utils import extract_exif_location, get_ip_location, tag_image_with_gps, get_google_maps_link, reverse_geocode
from sample_utils.notifier import send_damage_report_email

logger = logging.getLogger("civix_backend")
router = APIRouter(tags=["Legacy Frontend Compatibility APIs"])

CONFIG_FILE = ROOT_DIR / "config.json"
TEMP_DIR = ROOT_DIR / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def load_app_config():
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "smtp_server": settings.SMTP_SERVER,
        "smtp_port": settings.SMTP_PORT,
        "sender_email": settings.SENDER_EMAIL,
        "sender_password": settings.SENDER_PASSWORD,
        "recipient_email": settings.RECIPIENT_EMAIL,
        "enable_email": settings.ENABLE_EMAIL,
        "mongo_uri": settings.MONGO_URI,
        "enable_mongo": settings.ENABLE_MONGO
    }

def save_app_config(cfg: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

class StatusUpdatePayload(BaseModel):
    status: str

class ConfigPayload(BaseModel):
    smtp_server: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    sender_email: Optional[str] = ""
    sender_password: Optional[str] = ""
    recipient_email: Optional[str] = ""
    enable_email: Optional[bool] = False
    mongo_uri: Optional[str] = ""
    enable_mongo: Optional[bool] = False

@router.get("/api/config")
def get_config():
    return load_app_config()

@router.post("/api/config")
def update_config(payload: ConfigPayload):
    cfg = payload.dict()
    save_app_config(cfg)
    return {"status": "success", "config": cfg}

@router.get("/api/incidents")
def get_incidents(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    damage_type: Optional[str] = Query("All")
):
    cfg = load_app_config()
    mongo_uri = cfg.get("mongo_uri") if cfg.get("enable_mongo") else None
    
    incidents = db_module.get_all_incidents(mongo_uri=mongo_uri)
    
    total_incidents = len(incidents)
    pothole_count = sum(1 for inc in incidents if "Potholes" in inc.get("damage_types", []))
    crack_count = sum(1 for inc in incidents if any("Crack" in dt for dt in inc.get("damage_types", [])))
    resolved_count = sum(1 for inc in incidents if inc.get("status") == "Resolved")
    
    filtered = []
    for inc in incidents:
        inc_id = str(inc.get("id", ""))
        loc_desc = str(inc.get("location_desc", ""))
        source = str(inc.get("source", ""))
        
        match_query = not search or (
            search.lower() in inc_id.lower() or 
            search.lower() in loc_desc.lower() or 
            search.lower() in source.lower()
        )
        match_status = (status == "All") or (inc.get("status") == status)
        match_damage = (damage_type == "All") or (damage_type in inc.get("damage_types", []))
        
        if match_query and match_status and match_damage:
            filtered.append(inc)
            
    return {
        "metrics": {
            "total": total_incidents,
            "potholes": pothole_count,
            "cracks": crack_count,
            "resolved": resolved_count
        },
        "incidents": filtered
    }

@router.patch("/api/incidents/{inc_id}/status")
def update_status(inc_id: str, payload: StatusUpdatePayload):
    cfg = load_app_config()
    mongo_uri = cfg.get("mongo_uri") if cfg.get("enable_mongo") else None
    
    success = db_module.update_incident_status(inc_id, payload.status, mongo_uri=mongo_uri)
    if not success:
        raise HTTPException(status_code=404, detail="Incident not found or status update failed")
    return {"status": "success", "id": inc_id, "new_status": payload.status}

@router.post("/api/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    confidence: float = Form(0.5),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    loc_desc_custom: Optional[str] = Form(None),
    save_incident: bool = Form(False),
    send_email_alert: bool = Form(False)
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        nparr = np.frombuffer(contents, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if cv_img is None:
            raise HTTPException(status_code=400, detail="Invalid or unsupported image file format.")
        image = Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB))
    
    exif_lat, exif_lon = extract_exif_location(image)
    if lat is not None and lon is not None:
        final_lat, final_lon = lat, lon
        addr = reverse_geocode(final_lat, final_lon)
        loc_desc = f"{addr} (Device High-Accuracy GPS)" if addr else (loc_desc_custom or "Device GPS Coordinates")
    elif exif_lat is not None and exif_lon is not None:
        final_lat, final_lon = exif_lat, exif_lon
        addr = reverse_geocode(final_lat, final_lon)
        loc_desc = f"{addr} (Image EXIF GPS)" if addr else "Image EXIF GPS Metadata"
    else:
        ip_lat, ip_lon, ip_desc = get_ip_location()
        final_lat, final_lon = ip_lat, ip_lon
        loc_desc = ip_desc
        
    gmaps_url = get_google_maps_link(final_lat, final_lon)
    
    ai_service = get_ai_service()
    raw_detections, severity, annotated_np = ai_service.run_image_inference(image, confidence=confidence)
    
    detections = []
    detected_classes = set()
    for d in raw_detections:
        detections.append({
            "class_id": d["class_id"],
            "label": d["class_name"],
            "confidence": d["confidence"],
            "box": d["bbox"]
        })
        detected_classes.add(d["class_name"])

    tagged_result = tag_image_with_gps(annotated_np, final_lat, final_lon, loc_desc)
    tagged_pil = Image.fromarray(tagged_result) if isinstance(tagged_result, np.ndarray) else tagged_result
    
    buffered = io.BytesIO()
    tagged_pil.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    saved_doc = None
    if save_incident and detected_classes:
        cfg = load_app_config()
        mongo_uri = cfg.get("mongo_uri") if cfg.get("enable_mongo") else None
        
        saved_doc = db_module.save_incident_to_storage(
            mongo_uri=mongo_uri,
            damage_items=list(detected_classes),
            lat=final_lat,
            lon=final_lon,
            location_desc=loc_desc,
            source_type="Image Detection"
        )

        # Synchronize live report to PostgreSQL / SQLite relational database
        try:
            from app.db.session import SessionLocal
            from app.models.models import (
                Inspection as DBInspection,
                Detection as DBDetection,
                SeverityAssessment as DBSeverity,
                InspectionStatusEnum,
                SeverityLevelEnum,
                AssetTypeEnum
            )

            with SessionLocal() as db_session:
                sev_score = 50.0
                if isinstance(severity, dict):
                    sev_score = float(severity.get("score", 50.0))
                elif isinstance(severity, (int, float)):
                    sev_score = float(severity)

                if sev_score >= 80 or (isinstance(severity, dict) and str(severity.get("level")).upper() == "CRITICAL"):
                    sev_enum = SeverityLevelEnum.CRITICAL
                elif sev_score >= 60 or (isinstance(severity, dict) and str(severity.get("level")).upper() == "HIGH"):
                    sev_enum = SeverityLevelEnum.HIGH
                elif sev_score >= 40 or (isinstance(severity, dict) and str(severity.get("level")).upper() == "MEDIUM"):
                    sev_enum = SeverityLevelEnum.MEDIUM
                else:
                    sev_enum = SeverityLevelEnum.LOW

                db_ins = DBInspection(
                    latitude=final_lat,
                    longitude=final_lon,
                    asset_type=AssetTypeEnum.ROAD,
                    status=InspectionStatusEnum.PENDING,
                    ai_status=InspectionStatusEnum.COMPLETED,
                    work_notes=loc_desc
                )
                db_session.add(db_ins)
                db_session.flush()

                db_sev = DBSeverity(
                    inspection_id=db_ins.id,
                    overall_score=sev_score,
                    severity_level=sev_enum,
                    details=severity if isinstance(severity, dict) else {"score": sev_score}
                )
                db_session.add(db_sev)

                for d in raw_detections:
                    det = DBDetection(
                        inspection_id=db_ins.id,
                        class_name=d.get("class_name", "Potholes"),
                        confidence=float(d.get("confidence", 0.85)),
                        bbox=d.get("bbox", [0, 0, 0, 0]),
                        area_sq_m=float(d.get("area_sq_m", 1.0)) if d.get("area_sq_m") else None
                    )
                    db_session.add(det)

                db_session.commit()
        except Exception as db_err:
            logger.warning(f"Live database sync warning: {db_err}")
        
        if send_email_alert or cfg.get("enable_email"):
            if cfg.get("sender_email") and cfg.get("sender_password") and cfg.get("recipient_email"):
                img_bytes = buffered.getvalue()
                send_damage_report_email(
                    smtp_server=cfg.get("smtp_server", "smtp.gmail.com"),
                    smtp_port=cfg.get("smtp_port", 587),
                    sender_email=cfg.get("sender_email"),
                    sender_password=cfg.get("sender_password"),
                    recipient_email=cfg.get("recipient_email"),
                    damage_types=list(detected_classes),
                    lat=final_lat,
                    lon=final_lon,
                    loc_desc=loc_desc,
                    gmaps_url=gmaps_url,
                    image_bytes=img_bytes
                )
                
    return {
        "annotated_image": f"data:image/jpeg;base64,{img_str}",
        "detections": detections,
        "damage_types": list(detected_classes),
        "location": {
            "latitude": final_lat,
            "longitude": final_lon,
            "description": loc_desc,
            "google_maps_url": gmaps_url
        },
        "severity": severity,
        "saved_incident": saved_doc
    }

@router.post("/api/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    confidence: float = Form(0.5)
):
    contents = await file.read()
    input_path = TEMP_DIR / f"input_{file.filename}"
    output_filename = f"out_{Path(file.filename).stem}.mp4"
    output_path = TEMP_DIR / output_filename
    
    with open(input_path, "wb") as f:
        f.write(contents)
        
    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Could not open video file")
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    detected_classes = set()
    processed_frames = 0
    
    ai_service = get_ai_service()
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        raw_dets, severity, ann_frame = ai_service.run_image_inference(frame, confidence=confidence)
        if len(raw_dets) > 0:
            for d in raw_dets:
                detected_classes.add(d["class_name"])
            out.write(ann_frame)
        else:
            out.write(frame)
            
        processed_frames += 1
        
    cap.release()
    out.release()
    
    return {
        "status": "completed",
        "video_url": f"/api/temp/{output_filename}",
        "total_frames": total_frames,
        "processed_frames": processed_frames,
        "damage_types": list(detected_classes)
    }

@router.get("/api/temp/{filename}")
def get_temp_file(filename: str):
    file_path = TEMP_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@router.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected for realtime detection")
    ai_service = get_ai_service()
    try:
        while True:
            data = await websocket.receive_json()
            image_data = data.get("image", "")
            conf = data.get("confidence", 0.5)
            
            if image_data.startswith("data:image"):
                header, encoded = image_data.split(",", 1)
                img_bytes = base64.b64decode(encoded)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is not None:
                    raw_dets, severity, annotated_frame = ai_service.run_image_inference(frame, confidence=conf)
                    detections = []
                    annotated_b64 = ""
                    
                    if len(raw_dets) > 0:
                        for d in raw_dets:
                            detections.append({
                                "class_name": d["class_name"],
                                "confidence": d["confidence"],
                                "box": d["bbox"]
                            })
                        _, buffer = cv2.imencode('.jpg', annotated_frame)
                        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')
                        
                    await websocket.send_json({
                        "detections": detections,
                        "severity": severity,
                        "annotated_image": annotated_b64
                    })
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

@router.get("/api/export/csv")
def export_csv():
    incidents = db_module.get_all_incidents()
    output = io.StringIO()
    output.write("Incident ID,Timestamp,Source,Detected Damage,Location Description,Status,Google Maps Link\n")
    for inc in incidents:
        dt_str = ", ".join(inc.get("damage_types", [])) if isinstance(inc.get("damage_types"), list) else str(inc.get("damage_types", ""))
        output.write(f'"{inc.get("id")}","{inc.get("timestamp")}","{inc.get("source")}","{dt_str}","{inc.get("location_desc")}","{inc.get("status")}","{inc.get("google_maps_url")}"\n')
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=Road_Damage_Incidents.csv"})

@router.get("/api/export/json")
def export_json():
    incidents = db_module.get_all_incidents()
    return JSONResponse(content=incidents, headers={"Content-Disposition": "attachment; filename=Road_Damage_Incidents.json"})
