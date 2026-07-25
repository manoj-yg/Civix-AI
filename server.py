import os
os.environ["ULTRALYTICS_AUTOUPDATE"] = "false"
import io
import json
import base64
import logging
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image

from fastapi import FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Core PyTorch / YOLO model
from ultralytics import YOLO

# Project Utilities
from sample_utils.download import download_file
import sample_utils.db as db_module
from sample_utils.geo_utils import extract_exif_location, get_ip_location, tag_image_with_gps, get_google_maps_link, reverse_geocode
from sample_utils.notifier import send_damage_report_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civix_backend")

ROOT_DIR = Path(__file__).parent
MODELS_DIR = ROOT_DIR / "models"
TEMP_DIR = ROOT_DIR / "temp"
DATA_DIR = ROOT_DIR / "data"
CONFIG_FILE = ROOT_DIR / "config.json"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

MODEL_URL = "https://github.com/oracl4/RoadDamageDetection/raw/main/models/YOLOv8_Small_RDD.pt"
MODEL_PATH = MODELS_DIR / "YOLOv8_Small_RDD.pt"

# Download model if missing
if not MODEL_PATH.exists():
    logger.info("Downloading YOLOv8 model weights...")
    download_file(MODEL_URL, MODEL_PATH, expected_size=89569358)

# Load YOLO model
logger.info(f"Loading YOLO model from {MODEL_PATH}...")
model = YOLO(MODEL_PATH)

CLASSES = [
    "Longitudinal Crack",
    "Transverse Crack",
    "Alligator Crack",
    "Potholes"
]

# Config management
def load_app_config():
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "sender_email": "",
        "sender_password": "",
        "recipient_email": "",
        "enable_email": False,
        "mongo_uri": "",
        "enable_mongo": False
    }

def save_app_config(cfg: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

app = FastAPI(title="Civix-AI Road Damage Detection API", version="2.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/api/health")
def health_check():
    return {"status": "ok", "model_loaded": True, "model_path": str(MODEL_PATH)}


@app.get("/api/config")
def get_config():
    return load_app_config()


@app.post("/api/config")
def update_config(payload: ConfigPayload):
    cfg = payload.dict()
    save_app_config(cfg)
    return {"status": "success", "config": cfg}


@app.get("/api/incidents")
def get_incidents(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("All"),
    damage_type: Optional[str] = Query("All")
):
    cfg = load_app_config()
    mongo_uri = cfg.get("mongo_uri") if cfg.get("enable_mongo") else None
    
    incidents = db_module.get_all_incidents(mongo_uri=mongo_uri)
    
    # Calculate metrics
    total_incidents = len(incidents)
    pothole_count = sum(1 for inc in incidents if "Potholes" in inc.get("damage_types", []))
    crack_count = sum(1 for inc in incidents if any("Crack" in dt for dt in inc.get("damage_types", [])))
    resolved_count = sum(1 for inc in incidents if inc.get("status") == "Resolved")
    
    # Apply filtering
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


@app.patch("/api/incidents/{inc_id}/status")
def update_status(inc_id: str, payload: StatusUpdatePayload):
    cfg = load_app_config()
    mongo_uri = cfg.get("mongo_uri") if cfg.get("enable_mongo") else None
    
    success = db_module.update_incident_status(inc_id, payload.status, mongo_uri=mongo_uri)
    if not success:
        raise HTTPException(status_code=404, detail="Incident not found or status update failed")
    return {"status": "success", "id": inc_id, "new_status": payload.status}


@app.post("/api/detect/image")
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
    
    # Geolocation resolution: provided -> EXIF -> IP
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
    
    # Run YOLO inference
    img_np = np.array(image)
    results = model(img_np, conf=confidence)
    
    detections = []
    detected_classes = set()
    annotated_np = img_np.copy()
    
    if len(results) > 0 and len(results[0].boxes) > 0:
        boxes = results[0].boxes
        annotated_np = results[0].plot()  # Ultralytics built-in bounding boxes
        
        for box in boxes:
            cls_id = int(box.cls[0].item())
            cls_name = CLASSES[cls_id] if cls_id < len(CLASSES) else f"Class_{cls_id}"
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()
            
            detections.append({
                "class_id": cls_id,
                "label": cls_name,
                "confidence": round(conf, 4),
                "box": [round(v, 2) for v in xyxy]
            })
            detected_classes.add(cls_name)
            
    # Tag GPS Watermark
    tagged_result = tag_image_with_gps(annotated_np, final_lat, final_lon, loc_desc)
    tagged_pil = Image.fromarray(tagged_result) if isinstance(tagged_result, np.ndarray) else tagged_result
    
    # Convert tagged image to base64
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
        
        # Email notification check
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
        "saved_incident": saved_doc
    }


@app.post("/api/detect/video")
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
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        results = model(frame, conf=confidence)
        if len(results) > 0:
            annotated_frame = results[0].plot()
            for box in results[0].boxes:
                cls_id = int(box.cls[0].item())
                if cls_id < len(CLASSES):
                    detected_classes.add(CLASSES[cls_id])
            out.write(annotated_frame)
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


@app.get("/api/temp/{filename}")
def get_temp_file(filename: str):
    file_path = TEMP_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@app.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected for realtime detection")
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
                    results = model(frame, conf=conf)
                    detections = []
                    annotated_b64 = ""
                    
                    if len(results) > 0 and len(results[0].boxes) > 0:
                        annotated_frame = results[0].plot()
                        for box in results[0].boxes:
                            cls_id = int(box.cls[0].item())
                            cls_name = CLASSES[cls_id] if cls_id < len(CLASSES) else f"Class_{cls_id}"
                            c_score = float(box.conf[0].item())
                            xyxy = box.xyxy[0].tolist()
                            detections.append({
                                "class_name": cls_name,
                                "confidence": round(c_score, 3),
                                "box": [round(v, 1) for v in xyxy]
                            })
                        _, buffer = cv2.imencode('.jpg', annotated_frame)
                        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')
                        
                    await websocket.send_json({
                        "detections": detections,
                        "annotated_image": annotated_b64
                    })
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


@app.get("/api/export/csv")
def export_csv():
    incidents = db_module.get_all_incidents()
    output = io.StringIO()
    output.write("Incident ID,Timestamp,Source,Detected Damage,Location Description,Status,Google Maps Link\n")
    for inc in incidents:
        dt_str = ", ".join(inc.get("damage_types", [])) if isinstance(inc.get("damage_types"), list) else str(inc.get("damage_types", ""))
        output.write(f'"{inc.get("id")}","{inc.get("timestamp")}","{inc.get("source")}","{dt_str}","{inc.get("location_desc")}","{inc.get("status")}","{inc.get("google_maps_url")}"\n')
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=Road_Damage_Incidents.csv"})


@app.get("/api/export/json")
def export_json():
    incidents = db_module.get_all_incidents()
    return JSONResponse(content=incidents, headers={"Content-Disposition": "attachment; filename=Road_Damage_Incidents.json"})


# Serve built React app frontend if dist directory exists
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
