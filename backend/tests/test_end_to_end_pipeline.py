import io
import pytest
from PIL import Image

from app.workers.tasks import process_ai_inspection_job
from app.models.models import Inspection, InspectionStatusEnum

def test_full_end_to_end_pipeline(client, db_session, admin_user_token_headers):
    # 1. Create dummy image buffer
    buf = io.BytesIO()
    img = Image.new("RGB", (640, 640), color=(120, 120, 120))
    img.save(buf, format="JPEG")
    buf.seek(0)

    # 2. Create inspection record via API
    payload = {
        "asset_type": "ROAD",
        "latitude": 12.9716,
        "longitude": 77.5946
    }

    create_resp = client.post("/api/v1/inspections", json=payload, headers=admin_user_token_headers)
    assert create_resp.status_code == 200
    create_data = create_resp.json()["data"]
    inspection_id = create_data["id"]
    assert inspection_id is not None

    # 3. Upload image media
    files = {"file": ("road_inspection.jpg", buf, "image/jpeg")}
    media_resp = client.post(f"/api/v1/inspections/{inspection_id}/media", files=files, headers=admin_user_token_headers)
    assert media_resp.status_code == 200

    # 4. Execute background AI job synchronously
    buf.seek(0)
    process_ai_inspection_job(inspection_id, buf.getvalue(), db=db_session)
    db_session.commit()
    db_session.expire_all()

    # 5. Verify DB persistence
    from uuid import UUID
    db_insp = db_session.query(Inspection).filter(Inspection.id == UUID(inspection_id)).first()
    assert db_insp is not None
    assert db_insp.ai_status == InspectionStatusEnum.COMPLETED
    assert db_insp.severity_assessment is not None

    # 6. Verify Blockchain Hash Audit
    bc_resp = client.get(f"/api/v1/blockchain/verify/{inspection_id}")
    assert bc_resp.status_code == 200
    bc_data = bc_resp.json()["data"]
    assert bc_data["verified"] is True
    assert bc_data["hash_match"] is True

    # 7. Verify PDF Report Generation
    pdf_resp = client.get(f"/api/v1/reports/pdf/{inspection_id}")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 0
