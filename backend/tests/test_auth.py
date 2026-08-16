def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_register_and_login_flow(client):
    user_payload = {
        "email": "inspector.test@civix.ai",
        "password": "SecurePassword123!",
        "full_name": "Test Inspector",
        "role": "INSPECTOR"
    }
    reg_resp = client.post("/api/v1/auth/register", json=user_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["success"] is True
    assert reg_data["data"]["email"] == "inspector.test@civix.ai"

    login_resp = client.post("/api/v1/auth/login", json={
        "email": "inspector.test@civix.ai",
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data["data"]
