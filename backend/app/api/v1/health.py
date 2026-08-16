from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ai_service import MODEL_PATH, get_ai_service

router = APIRouter(tags=["System Health & Observability"])

from sqlalchemy import text

@router.get("/health")
def health_check():
    ai = get_ai_service()
    return {
        "status": "ok",
        "service": "Civix-AI Production Backend",
        "version": "2.0.0",
        "model_loaded": ai.model is not None,
        "model_path": str(MODEL_PATH)
    }

@router.get("/health/ready")
def readiness_probe(db: Session = Depends(get_db)):
    """
    Kubernetes / Docker Container Readiness Probe.
    Checks database connection and AI pipeline initialization.
    """
    db_healthy = False
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as e:
        print("DB check error:", e)
        pass

    ai = get_ai_service()
    ai_ready = (ai.model is not None)

    if db_healthy and ai_ready:
        return {
            "status": "READY",
            "database": "CONNECTED",
            "ai_pipeline": "LOADED"
        }
    else:
        return Response(
            content='{"status": "UNREADY", "database": "%s", "ai_pipeline": "%s"}' % (
                "CONNECTED" if db_healthy else "DISCONNECTED",
                "LOADED" if ai_ready else "UNLOADED"
            ),
            status_code=503,
            media_type="application/json"
        )

@router.get("/health/live")
def liveness_probe():
    """
    Kubernetes / Docker Container Liveness Probe.
    Returns HTTP 200 OK as long as the backend server process is alive.
    """
    return {"status": "ALIVE", "timestamp": "OK"}
