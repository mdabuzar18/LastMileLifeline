from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import require_roles, get_current_user_payload
from backend.app.core.metrics import ACTIVE_ALERTS
from backend.app.models import Alert, AlertStatus, UserRole, utc_now
from backend.app.schemas import AlertCreate, AlertUpdate, AlertOut
from backend.app.worker.processor import create_and_enqueue_simulated_alerts

router = APIRouter(prefix="/alerts", tags=["Alerts"])

def update_active_alerts_metric(db: Session):
    count = db.query(Alert).filter(Alert.status == AlertStatus.PUBLISHED).count()
    ACTIVE_ALERTS.set(count)

@router.get("", response_model=List[AlertOut])
def list_alerts(
    status: Optional[AlertStatus] = None,
    zone: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if zone:
        query = query.filter(Alert.zone == zone)
    return query.order_by(Alert.created_at.desc()).all()

@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_draft_alert(
    alert_in: AlertCreate,
    current_user: dict = Depends(require_roles(UserRole.COORDINATOR)),
    db: Session = Depends(get_db)
):
    """
    Coordinators create initial draft alerts.
    """
    user_id = int(current_user["sub"])
    alert = Alert(
        title=alert_in.title,
        message=alert_in.message,
        zone=alert_in.zone,
        severity=alert_in.severity,
        status=AlertStatus.DRAFT,
        created_by_id=user_id,
        created_at=utc_now()
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.put("/{alert_id}", response_model=AlertOut)
def update_draft_alert(
    alert_id: int,
    alert_in: AlertUpdate,
    current_user: dict = Depends(require_roles(UserRole.COORDINATOR)),
    db: Session = Depends(get_db)
):
    """
    Coordinators can edit alerts while they are in DRAFT or PENDING_APPROVAL status.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.status not in (AlertStatus.DRAFT, AlertStatus.PENDING_APPROVAL):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit alert in state '{alert.status.value}'. Only DRAFT or PENDING_APPROVAL alerts can be modified."
        )

    if alert_in.title is not None:
        alert.title = alert_in.title
    if alert_in.message is not None:
        alert.message = alert_in.message
    if alert_in.zone is not None:
        alert.zone = alert_in.zone
    if alert_in.severity is not None:
        alert.severity = alert_in.severity

    alert.updated_at = utc_now()
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/submit-approval", response_model=AlertOut)
def submit_for_approval(
    alert_id: int,
    current_user: dict = Depends(require_roles(UserRole.COORDINATOR)),
    db: Session = Depends(get_db)
):
    """
    Coordinator submits a draft alert for approver review.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.status != AlertStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Alert cannot be submitted for approval from state '{alert.status.value}'. Must be in DRAFT state."
        )

    alert.status = AlertStatus.PENDING_APPROVAL
    alert.updated_at = utc_now()
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/approve-and-publish", response_model=AlertOut)
def approve_and_publish_alert(
    alert_id: int,
    current_user: dict = Depends(require_roles(UserRole.APPROVER)),
    db: Session = Depends(get_db)
):
    """
    Approver reviews and authorizes publishing of the alert.
    Publishing enqueues simulated notifications to the mock provider.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.status != AlertStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only alerts in PENDING_APPROVAL can be approved and published (current state: '{alert.status.value}')."
        )

    user_id = int(current_user["sub"])
    now = utc_now()
    alert.status = AlertStatus.PUBLISHED
    alert.approved_by_id = user_id
    alert.approved_at = now
    alert.published_by_id = user_id
    alert.published_at = now
    alert.updated_at = now
    db.commit()
    db.refresh(alert)

    # Enqueue simulated notifications for fictional residents in affected zone
    create_and_enqueue_simulated_alerts(db, alert, count_per_zone=6, force_fail_count=2)
    update_active_alerts_metric(db)

    return alert

@router.post("/{alert_id}/close", response_model=AlertOut)
def close_alert(
    alert_id: int,
    current_user: dict = Depends(require_roles(UserRole.COORDINATOR, UserRole.APPROVER)),
    db: Session = Depends(get_db)
):
    """
    Closes an active published alert.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status != AlertStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only published alerts can be closed (current status: '{alert.status.value}')."
        )

    user_id = int(current_user["sub"])
    now = utc_now()
    alert.status = AlertStatus.CLOSED
    alert.closed_by_id = user_id
    alert.closed_at = now
    alert.updated_at = now
    db.commit()
    db.refresh(alert)
    update_active_alerts_metric(db)

    return alert
