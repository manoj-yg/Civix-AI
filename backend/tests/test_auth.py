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
    # Register (or handle if already exists)
    reg_resp = client.post("/api/v1/auth/register", json=user_payload)
    assert reg_resp.status_code in (200, 422, 400)

    login_resp = client.post("/api/v1/auth/login", json={
        "email": "inspector.test@civix.ai",
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data["data"]
    token = login_data["data"]["access_token"]

    # Test /auth/me with Bearer token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["data"]["email"] == "inspector.test@civix.ai"
    assert me_data["data"]["role"] == "INSPECTOR"

def test_admin_and_citizen_logins(client):
    # Test Admin login
    admin_resp = client.post("/api/v1/auth/login", json={
        "email": "admin@civix.gov",
        "password": "admin123"
    })
    assert admin_resp.status_code == 200
    admin_token = admin_resp.json()["data"]["access_token"]
    assert admin_resp.json()["data"]["role"] == "ADMIN"

    # Verify admin profile
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["email"] == "admin@civix.gov"

    # Test Citizen login
    citizen_resp = client.post("/api/v1/auth/login", json={
        "email": "citizen@civix.gov",
        "password": "citizen123"
    })
    assert citizen_resp.status_code == 200
    assert citizen_resp.json()["data"]["role"] == "CITIZEN"

