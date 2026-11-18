import logging
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.models import (
    SimulatedNotification,
    NotificationStatus,
    Alert,
    utc_now
)
from backend.app.worker.queue import push_notification_job
from backend.app.core.metrics import (
    NOTIFICATIONS_DELIVERED,
    NOTIFICATIONS_FAILED,
    NOTIFICATIONS_RETRIED
)

logger = logging.getLogger(__name__)

def process_single_notification_job(job_data: Dict[str, Any], db: Session) -> bool:
    """
    Process one simulated notification job with retry and status tracking.
    """
    notification_id = job_data.get("notification_id")
    force_fail = job_data.get("force_fail", False)
    
    notification: Optional[SimulatedNotification] = db.query(SimulatedNotification).filter(
        SimulatedNotification.id == notification_id
    ).first()

    if not notification:
        logger.warning(f"Notification with id {notification_id} not found.")
        return False

    # Mark as processing
    notification.status = NotificationStatus.PROCESSING
    notification.attempt_count += 1
    db.commit()

    # Determine simulated outcome
    should_fail = force_fail or (random.random() < settings.SIMULATE_FAILURE_RATE)
    
    if should_fail:
        err_msg = f"Simulated telecommunication gateway timeout (Attempt #{notification.attempt_count})"
        notification.last_error = err_msg
        
        if notification.attempt_count < notification.max_retries:
            logger.info(f"Notification {notification_id} failed transiently. Scheduling retry #{notification.attempt_count + 1}...")
            notification.status = NotificationStatus.QUEUED
            db.commit()
            NOTIFICATIONS_RETRIED.labels(channel=notification.channel).inc()
            
            # Short retry delay then re-enqueue
            time.sleep(settings.RETRY_DELAY_SECONDS)
            # Next attempt will not force fail unless global rate specifies
            job_data["force_fail"] = False
            push_notification_job(job_data)
            return False
        else:
            logger.warning(f"Notification {notification_id} exceeded max retries ({notification.max_retries}). Marked FAILED.")
            notification.status = NotificationStatus.FAILED
            notification.failed_at = utc_now()
            db.commit()
            NOTIFICATIONS_FAILED.labels(channel=notification.channel).inc()
            return False
    else:
        # Success (Simulated delivery)
        notification.status = NotificationStatus.SENT
        notification.sent_at = utc_now()
        notification.last_error = None
        db.commit()
        NOTIFICATIONS_DELIVERED.labels(channel=notification.channel).inc()
        logger.info(f"Simulated notification {notification_id} sent successfully to {notification.recipient_pseudonym}.")
        return True

def create_and_enqueue_simulated_alerts(
    db: Session,
    alert: Alert,
    count_per_zone: int = 5,
    force_fail_count: int = 1
) -> int:
    """
    Generates fictional recipient contacts for the affected zone and enqueues simulated messages.
    """
    from backend.app.core.metrics import NOTIFICATIONS_ENQUEUED

    enqueued_count = 0
    # Seed fictional contacts for the alert's zone
    for i in range(1, count_per_zone + 1):
        pseudonym = f"Fictional Resident #{alert.id * 100 + i:04d} ({alert.zone.split('-')[0].strip()})"
        payload_text = (
            f"[SIMULATED MOCK ALERT] {alert.severity.value.upper()}: {alert.title}. "
            f"{alert.message}. Zone: {alert.zone}. "
            f"THIS IS A TEST/DEMO NOTIFICATION. DO NOT CALL 911."
        )
        
        notif = SimulatedNotification(
            alert_id=alert.id,
            recipient_pseudonym=pseudonym,
            recipient_zone=alert.zone,
            channel="SIMULATED_SMS",
            payload=payload_text,
            status=NotificationStatus.QUEUED,
            attempt_count=0,
            max_retries=settings.MAX_NOTIFICATION_RETRIES,
            is_simulated=True
        )
        db.add(notif)
        db.flush()  # get id

        # Designate specified number of notifications to simulate a transient network fail & retry
        should_fail_first = (i <= force_fail_count)
        job_data = {
            "notification_id": notif.id,
            "alert_id": alert.id,
            "force_fail": should_fail_first
        }
        push_notification_job(job_data)
        NOTIFICATIONS_ENQUEUED.labels(zone=alert.zone, channel=notif.channel).inc()
        enqueued_count += 1

    db.commit()
    return enqueued_count
