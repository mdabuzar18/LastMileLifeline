import hashlib
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.core.metrics import CHECKINS_TOTAL
from backend.app.models import Alert, AlertStatus, CheckIn, CheckInStatus, utc_now
from backend.app.schemas import (
    CheckInCreate,
    CheckInOut,
    AlertCheckInAggregate,
    ZoneSummary,
    AlertOut
)

router = APIRouter(prefix="/checkins", tags=["Resident Check-Ins"])

def hash_resident_id(identifier: str) -> str:
    """Create a pseudonymized SHA256 identifier from a resident handle/pseudonym."""
    clean = identifier.strip().lower()
    return hashlib.sha256(clean.encode()).hexdigest()[:16]

@router.get("/active-alerts", response_model=List[AlertOut])
def get_active_alerts_for_checkin(db: Session = Depends(get_db)):
    """Public list of active published alerts for residents to select and check in."""
    return db.query(Alert).filter(Alert.status == AlertStatus.PUBLISHED).order_by(Alert.published_at.desc()).all()

@router.post("", response_model=Dict[str, str], status_code=status.HTTP_200_OK)
def submit_checkin(checkin_in: CheckInCreate, db: Session = Depends(get_db)):
    """
    Submits a resident check-in.
    Idempotent: If the same resident identifier submits again for the same alert,
    the existing record is updated instead of creating a duplicate that inflates counts.
    """
    alert = db.query(Alert).filter(Alert.id == checkin_in.alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != AlertStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-ins are only accepted for PUBLISHED alerts (current alert status: {alert.status.value})"
        )

    res_hash = hash_resident_id(checkin_in.resident_identifier)
    
    # Check if resident has already submitted for this alert
    existing = db.query(CheckIn).filter(
        CheckIn.alert_id == checkin_in.alert_id,
        CheckIn.resident_id_hash == res_hash
    ).first()

    now = utc_now()
    if existing:
        existing.status = checkin_in.status
        existing.zone = checkin_in.zone
        existing.assistance_notes = checkin_in.assistance_notes
        existing.updated_at = now
        db.commit()
        action_message = "Your check-in status was updated successfully. Thank you for keeping responders informed."
    else:
        new_checkin = CheckIn(
            alert_id=checkin_in.alert_id,
            resident_id_hash=res_hash,
            zone=checkin_in.zone,
            status=checkin_in.status,
            assistance_notes=checkin_in.assistance_notes,
            submitted_at=now,
            updated_at=now
        )
        db.add(new_checkin)
        db.commit()
        CHECKINS_TOTAL.labels(status=checkin_in.status.value, zone=checkin_in.zone).inc()
        action_message = "Check-in received and recorded successfully. Responders have been notified of your status."

    return {
        "status": "success",
        "message": action_message,
        "alert_title": alert.title,
        "recorded_status": checkin_in.status.value,
        "zone": checkin_in.zone,
        "deduplication_mode": "upsert_by_resident_hash"
    }

@router.get("/aggregate/{alert_id}", response_model=AlertCheckInAggregate)
def get_alert_aggregate_status(alert_id: int, db: Session = Depends(get_db)):
    """
    Responder view: Aggregate check-in statistics grouped by zone.
    Does not display residents' exact contact details or addresses.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    all_checkins: List[CheckIn] = db.query(CheckIn).filter(CheckIn.alert_id == alert_id).all()

    total_checkins = len(all_checkins)
    safe_total = sum(1 for c in all_checkins if c.status == CheckInStatus.SAFE)
    need_assistance_total = sum(1 for c in all_checkins if c.status == CheckInStatus.NEED_ASSISTANCE)
    unable_to_respond_total = sum(1 for c in all_checkins if c.status == CheckInStatus.UNABLE_TO_RESPOND)

    # Group by zone
    zones_dict: Dict[str, Dict[str, int]] = {}
    for c in all_checkins:
        z = c.zone or "Unspecified Zone"
        if z not in zones_dict:
            zones_dict[z] = {"safe": 0, "need_assistance": 0, "unable_to_respond": 0, "total": 0}
        
        zones_dict[z]["total"] += 1
        if c.status == CheckInStatus.SAFE:
            zones_dict[z]["safe"] += 1
        elif c.status == CheckInStatus.NEED_ASSISTANCE:
            zones_dict[z]["need_assistance"] += 1
        elif c.status == CheckInStatus.UNABLE_TO_RESPOND:
            zones_dict[z]["unable_to_respond"] += 1

    zone_summaries = [
        ZoneSummary(
            zone=z_name,
            safe_count=data["safe"],
            need_assistance_count=data["need_assistance"],
            unable_to_respond_count=data["unable_to_respond"],
            total=data["total"]
        )
        for z_name, data in sorted(zones_dict.items())
    ]

    # Recent assistance requests (sanitized, max 10)
    assistance_requests = [
        c for c in all_checkins 
        if c.status == CheckInStatus.NEED_ASSISTANCE and c.assistance_notes
    ]
    assistance_requests.sort(key=lambda x: x.updated_at or x.submitted_at, reverse=True)

    return AlertCheckInAggregate(
        alert_id=alert.id,
        alert_title=alert.title,
        alert_zone=alert.zone,
        alert_severity=alert.severity,
        alert_status=alert.status,
        total_checkins=total_checkins,
        safe_total=safe_total,
        need_assistance_total=need_assistance_total,
        unable_to_respond_total=unable_to_respond_total,
        zones=zone_summaries,
        recent_assistance_requests=assistance_requests[:10]
    )
