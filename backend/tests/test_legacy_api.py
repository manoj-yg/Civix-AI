def test_legacy_incidents_api(client):
    resp = client.get("/api/incidents")
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    assert "incidents" in data

def test_legacy_config_api(client):
    resp = client.get("/api/config")
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)
