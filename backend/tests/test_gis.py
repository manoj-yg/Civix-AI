def test_gis_endpoints(client):
    heatmap_resp = client.get("/api/v1/gis/heatmap")
    assert heatmap_resp.status_code == 200
    assert heatmap_resp.json()["success"] is True

    defects_resp = client.get("/api/v1/gis/defects")
    assert defects_resp.status_code == 200
    assert defects_resp.json()["data"]["type"] == "FeatureCollection"
