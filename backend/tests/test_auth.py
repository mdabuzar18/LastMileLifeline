def test_demo_accounts_list(client):
    res = client.get("/api/v1/auth/demo-accounts")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 4
    roles = [u["role"] for u in users]
    assert "coordinator" in roles
    assert "approver" in roles
    assert "responder" in roles
    assert "resident" in roles

def test_login_success(client):
    payload = {
        "email": "coordinator@lastmile.demo",
        "password": "coordinator123"
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "coordinator@lastmile.demo"
    assert data["user"]["role"] == "coordinator"

def test_login_invalid_password(client):
    payload = {
        "email": "coordinator@lastmile.demo",
        "password": "wrongpassword"
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]

def test_get_current_user_me(client, coordinator_headers):
    res = client.get("/api/v1/auth/me", headers=coordinator_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "coordinator@lastmile.demo"
