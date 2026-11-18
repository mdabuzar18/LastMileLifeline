import time
from backend.app.models import (
    SimulatedNotification,
    NotificationStatus,
    Alert
)
from backend.app.worker.processor import process_single_notification_job
from backend.app.worker.queue import (
    set_worker_paused,
    is_worker_paused,
    get_queue_length
)

def test_worker_pause_control():
    set_worker_paused(True)
    assert is_worker_paused() is True
    set_worker_paused(False)
    assert is_worker_paused() is False

def test_notification_delivery_success(db_session):
    alert = db_session.query(Alert).first()
    notif = SimulatedNotification(
        alert_id=alert.id,
        recipient_pseudonym="Simulated Resident #777",
        recipient_zone=alert.zone,
        channel="SIMULATED_SMS",
        payload="Test alert message",
        status=NotificationStatus.QUEUED,
        attempt_count=0,
        max_retries=3,
        is_simulated=True
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)

    job_data = {
        "notification_id": notif.id,
        "alert_id": alert.id,
        "force_fail": False
    }

    success = process_single_notification_job(job_data, db_session)
    assert success is True

    db_session.refresh(notif)
    assert notif.status == NotificationStatus.SENT
    assert notif.sent_at is not None
    assert notif.attempt_count == 1

def test_notification_retry_and_exhaustion(db_session):
    alert = db_session.query(Alert).first()
    notif = SimulatedNotification(
        alert_id=alert.id,
        recipient_pseudonym="Simulated Resident #888",
        recipient_zone=alert.zone,
        channel="SIMULATED_SMS",
        payload="Test alert message with intentional retry",
        status=NotificationStatus.QUEUED,
        attempt_count=0,
        max_retries=2,
        is_simulated=True
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)

    # Attempt 1: forced failure -> triggers retry
    job_data = {
        "notification_id": notif.id,
        "alert_id": alert.id,
        "force_fail": True
    }
    success_1 = process_single_notification_job(job_data, db_session)
    assert success_1 is False

    db_session.refresh(notif)
    assert notif.attempt_count == 1
    assert notif.status == NotificationStatus.QUEUED
    assert "Simulated telecommunication gateway timeout" in notif.last_error

    # Attempt 2: forced failure -> reaches max_retries (2) -> transitions to FAILED
    job_data_2 = {
        "notification_id": notif.id,
        "alert_id": alert.id,
        "force_fail": True
    }
    success_2 = process_single_notification_job(job_data_2, db_session)
    assert success_2 is False

    db_session.refresh(notif)
    assert notif.attempt_count == 2
    assert notif.status == NotificationStatus.FAILED
    assert notif.failed_at is not None
