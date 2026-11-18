def test_create_draft_alert_role_permissions(client, coordinator_headers, resident_headers):
    payload = {
        "title": "High Water Alert Near Riverfront",
        "message": "Water levels rising above 12 feet. Stay clear of riverbanks.",
        "zone": "Zone Alpha - Riverfront",
        "severity": "high"
    }

    # Resident cannot create draft alert
    res_resident = client.post("/api/v1/alerts", json=payload, headers=resident_headers)
    assert res_resident.status_code == 403

    # Coordinator can create draft alert
    res_coord = client.post("/api/v1/alerts", json=payload, headers=coordinator_headers)
    assert res_coord.status_code == 201
    data = res_coord.json()
    assert data["status"] == "draft"
    assert data["created_by_id"] == 1
    assert data["title"] == payload["title"]

def test_alert_lifecycle_approval_and_publishing(client, coordinator_headers, approver_headers):
    # 1. Create Draft
    create_res = client.post("/api/v1/alerts", json={
        "title": "Severe Storm Precautionary Notice",
        "message": "Strong gusts anticipated across hill communities.",
        "zone": "Zone Beta - Highland Ridge",
        "severity": "medium"
    }, headers=coordinator_headers)
    assert create_res.status_code == 201
    alert_id = create_res.json()["id"]

    # 2. Coordinator submits for approval
    submit_res = client.post(f"/api/v1/alerts/{alert_id}/submit-approval", headers=coordinator_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "pending_approval"

    # 3. Coordinator cannot approve their own alert (role separation)
    coord_approve = client.post(f"/api/v1/alerts/{alert_id}/approve-and-publish", headers=coordinator_headers)
    assert coord_approve.status_code == 403

    # 4. Approver approves and publishes
    approver_res = client.post(f"/api/v1/alerts/{alert_id}/approve-and-publish", headers=approver_headers)
    assert approver_res.status_code == 200
    published_data = approver_res.json()
    assert published_data["status"] == "published"
    assert published_data["approved_by_id"] == 2
    assert published_data["published_by_id"] == 2
    assert published_data["published_at"] is not None

    # 5. Coordinator closes alert
    close_res = client.post(f"/api/v1/alerts/{alert_id}/close", headers=coordinator_headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"
    assert close_res.json()["closed_by_id"] == 1
