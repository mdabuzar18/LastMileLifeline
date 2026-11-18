def test_liveness(client):
    res = client.get("/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "alive"
    assert "LastMile Lifeline" in data["app"]

def test_readiness(client):
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "database" in data["dependencies"]
    assert "healthy" in data["dependencies"]["database"]

def test_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    text = res.text
    assert "http_requests_total" in text or "process_virtual_memory_bytes" in text
