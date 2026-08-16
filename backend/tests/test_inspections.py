def test_create_and_get_inspection(client):
    payload = {
        "asset_type": "ROAD",
        "latitude": 12.9172,
        "longitude": 77.6362,
        "device_info": {"device": "Mobile Inspector Terminal"}
    }
    resp = client.post("/api/v1/inspections", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    inc_id = data["data"]["id"]

    get_resp = client.get(f"/api/v1/inspections/{inc_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == inc_id
