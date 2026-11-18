from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models import (
    SimulatedNotification,
    NotificationStatus,
    Alert
)
from backend.app.schemas import (
    SimulatedNotificationOut,
    NotificationQueueStats
)
from backend.app.worker.queue import (
    get_queue_length,
    set_worker_paused,
    is_worker_paused,
    pop_notification_job
)
from backend.app.worker.processor import process_single_notification_job

router = APIRouter(prefix="/notifications", tags=["Simulated Notifications"])

@router.get("", response_model=List[SimulatedNotificationOut])
def list_notifications(
    alert_id: Optional[int] = None,
    status: Optional[NotificationStatus] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(SimulatedNotification)
    if alert_id:
        query = query.filter(SimulatedNotification.alert_id == alert_id)
    if status:
        query = query.filter(SimulatedNotification.status == status)
    return query.order_by(SimulatedNotification.queued_at.desc()).limit(limit).all()

@router.get("/stats", response_model=NotificationQueueStats)
def get_notification_stats(db: Session = Depends(get_db)):
    queued_count = db.query(SimulatedNotification).filter(SimulatedNotification.status == NotificationStatus.QUEUED).count()
    processing_count = db.query(SimulatedNotification).filter(SimulatedNotification.status == NotificationStatus.PROCESSING).count()
    sent_count = db.query(SimulatedNotification).filter(SimulatedNotification.status == NotificationStatus.SENT).count()
    failed_count = db.query(SimulatedNotification).filter(SimulatedNotification.status == NotificationStatus.FAILED).count()
    
    recent_jobs = db.query(SimulatedNotification).order_by(SimulatedNotification.queued_at.desc()).limit(15).all()
    
    paused = is_worker_paused()
    return NotificationQueueStats(
        total_queued=queued_count,
        total_processing=processing_count,
        total_sent=sent_count,
        total_failed=failed_count,
        worker_running=not paused,
        recent_jobs=recent_jobs
    )

@router.post("/worker/pause")
def toggle_worker_pause(paused: bool = Body(..., embed=True)):
    """
    Pause or unpause the background worker.
    Used during live demos to pause the worker, trigger a published alert to observe
    messages accumulating in the QUEUED state, and then unpause to watch them drain and recover!
    """
    set_worker_paused(paused)
    return {
        "status": "success",
        "worker_paused": paused,
        "message": f"Simulated notification worker has been {'PAUSED' if paused else 'RESUMED'}."
    }

@router.post("/process-next-job")
def process_next_job_manually(db: Session = Depends(get_db)):
    """
    Demo/testing helper: Manually trigger consumption of the next queued job.
    Enables step-by-step queue demonstrations without running a separate terminal worker.
    """
    job = pop_notification_job(timeout=1)
    if not job:
        return {"status": "empty", "message": "Queue is currently empty."}
    
    success = process_single_notification_job(job, db)
    return {
        "status": "processed",
        "job": job,
        "delivery_success": success
    }
