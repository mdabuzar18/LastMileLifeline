def test_checkin_submission_and_deduplication(client):
    # Find published alert
    active_alerts = client.get("/api/v1/checkins/active-alerts").json()
    assert len(active_alerts) > 0
    alert_id = active_alerts[0]["id"]

    # 1. Initial check-in submission
    first_res = client.post("/api/v1/checkins", json={
        "alert_id": alert_id,
        "resident_identifier": "resident-test-user-42",
        "zone": "Zone Alpha - Riverfront",
        "status": "need_assistance",
        "assistance_notes": "Assistance requested with portable generator."
    })
    assert first_res.status_code == 200
    assert first_res.json()["status"] == "success"
    assert "recorded successfully" in first_res.json()["message"]

    # 2. Re-submission by the same resident for the same alert (e.g. resident later becomes safe)
    # Must update the existing record rather than inflating total headcount
    agg_before = client.get(f"/api/v1/checkins/aggregate/{alert_id}").json()
    total_before = agg_before["total_checkins"]

    second_res = client.post("/api/v1/checkins", json={
        "alert_id": alert_id,
        "resident_identifier": "resident-test-user-42",
        "zone": "Zone Alpha - Riverfront",
        "status": "safe",
        "assistance_notes": "Neighbor helped with generator, all safe now."
    })
    assert second_res.status_code == 200
    assert "updated successfully" in second_res.json()["message"]

    agg_after = client.get(f"/api/v1/checkins/aggregate/{alert_id}").json()
    total_after = agg_after["total_checkins"]

    # Total checkin count must NOT inflate
    assert total_after == total_before
    # Safe count should increase by 1
    assert agg_after["safe_total"] >= 1

def test_responder_aggregate_summary(client):
    active_alerts = client.get("/api/v1/checkins/active-alerts").json()
    alert_id = active_alerts[0]["id"]

    res = client.get(f"/api/v1/checkins/aggregate/{alert_id}")
    assert res.status_code == 200
    data = res.json()
    assert "alert_id" in data
    assert "zones" in data
    assert isinstance(data["zones"], list)
    assert "safe_total" in data
    assert "need_assistance_total" in data
    assert "unable_to_respond_total" in data
