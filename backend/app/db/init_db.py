import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from backend.app.core.database import Base, engine, SessionLocal
from backend.app.core.security import hash_password
from backend.app.models import (
    User, UserRole,
    Alert, AlertSeverity, AlertStatus,
    CheckIn, CheckInStatus,
    SimulatedNotification, NotificationStatus,
    utc_now
)

logger = logging.getLogger(__name__)

FICTIONAL_ZONES = [
    "Zone Alpha - Riverfront",
    "Zone Beta - Highland Ridge",
    "Zone Gamma - Valley Creek",
    "Zone Delta - Industrial Basin"
]

def init_db(db: Session) -> None:
    # Create tables
    Base.metadata.create_all(bind=engine)

    # 1. Seed demo users if not present
    existing_user = db.query(User).first()
    if existing_user:
        logger.info("Database already initialized with users.")
        return

    logger.info("Seeding fictional demo users...")
    users = [
        User(
            email="coordinator@lastmile.demo",
            full_name="Dana Miller (Coordinator)",
            hashed_password=hash_password("coordinator123"),
            role=UserRole.COORDINATOR,
            is_active=True
        ),
        User(
            email="approver@lastmile.demo",
            full_name="Alex Reed (Approver)",
            hashed_password=hash_password("approver123"),
            role=UserRole.APPROVER,
            is_active=True
        ),
        User(
            email="responder@lastmile.demo",
            full_name="Sam Chen (Field Responder)",
            hashed_password=hash_password("responder123"),
            role=UserRole.RESPONDER,
            is_active=True
        ),
        User(
            email="resident@lastmile.demo",
            full_name="Jordan Taylor (Resident)",
            hashed_password=hash_password("resident123"),
            role=UserRole.RESIDENT,
            is_active=True
        ),
    ]
    for u in users:
        db.add(u)
    db.commit()

    coord = db.query(User).filter(User.role == UserRole.COORDINATOR).first()
    approv = db.query(User).filter(User.role == UserRole.APPROVER).first()

    now = utc_now()

    # 2. Seed Fictional Alerts
    logger.info("Seeding fictional alerts in various states...")
    alerts = [
        Alert(
            title="SIMULATED Flash Flood Advisory - Lower Basin",
            message="Rapidly rising water levels detected near the river spillway. Low-lying households should move to higher ground.",
            zone="Zone Alpha - Riverfront",
            severity=AlertSeverity.HIGH,
            status=AlertStatus.PUBLISHED,
            created_by_id=coord.id,
            approved_by_id=approv.id,
            published_by_id=approv.id,
            created_at=now - timedelta(hours=3),
            approved_at=now - timedelta(hours=2, minutes=50),
            published_at=now - timedelta(hours=2, minutes=45),
        ),
        Alert(
            title="SIMULATED Wildfire Smoke Warning - Ridge Area",
            message="Unfavorable wind conditions blowing simulated smoke into ridge neighborhoods. Limit outdoor exertion.",
            zone="Zone Beta - Highland Ridge",
            severity=AlertSeverity.MEDIUM,
            status=AlertStatus.PENDING_APPROVAL,
            created_by_id=coord.id,
            created_at=now - timedelta(hours=1),
        ),
        Alert(
            title="SIMULATED Infrastructure Inspection Notice",
            message="Routine precautionary assessment of local stormwater channels ahead of simulated rainstorm.",
            zone="Zone Gamma - Valley Creek",
            severity=AlertSeverity.LOW,
            status=AlertStatus.DRAFT,
            created_by_id=coord.id,
            created_at=now - timedelta(minutes=30),
        ),
        Alert(
            title="SIMULATED Power Grid Precautionary Alert (Resolved)",
            message="Simulated grid maintenance advisory has concluded. Normal operations restored.",
            zone="Zone Delta - Industrial Basin",
            severity=AlertSeverity.LOW,
            status=AlertStatus.CLOSED,
            created_by_id=coord.id,
            approved_by_id=approv.id,
            published_by_id=approv.id,
            closed_by_id=coord.id,
            created_at=now - timedelta(days=1),
            approved_at=now - timedelta(days=1, hours=-1),
            published_at=now - timedelta(days=1, hours=-1),
            closed_at=now - timedelta(hours=12),
        )
    ]
    for a in alerts:
        db.add(a)
    db.commit()

    published_alert = db.query(Alert).filter(Alert.status == AlertStatus.PUBLISHED).first()

    # 3. Seed Fictional Check-Ins for the Published Alert
    logger.info("Seeding fictional resident check-ins...")
    checkins = [
        CheckIn(
            alert_id=published_alert.id,
            resident_id_hash="demo_resident_hash_001",
            zone="Zone Alpha - Riverfront",
            status=CheckInStatus.SAFE,
            assistance_notes=None,
            submitted_at=now - timedelta(hours=2)
        ),
        CheckIn(
            alert_id=published_alert.id,
            resident_id_hash="demo_resident_hash_002",
            zone="Zone Alpha - Riverfront",
            status=CheckInStatus.NEED_ASSISTANCE,
            assistance_notes="Elderly resident needs mobility assistance with sandbags.",
            submitted_at=now - timedelta(hours=1, minutes=45)
        ),
        CheckIn(
            alert_id=published_alert.id,
            resident_id_hash="demo_resident_hash_003",
            zone="Zone Alpha - Riverfront",
            status=CheckInStatus.NEED_ASSISTANCE,
            assistance_notes="First floor basement flooding starting; power switched off.",
            submitted_at=now - timedelta(hours=1, minutes=30)
        ),
        CheckIn(
            alert_id=published_alert.id,
            resident_id_hash="demo_resident_hash_004",
            zone="Zone Beta - Highland Ridge",
            status=CheckInStatus.SAFE,
            assistance_notes="On high ground, all good.",
            submitted_at=now - timedelta(hours=1, minutes=10)
        ),
        CheckIn(
            alert_id=published_alert.id,
            resident_id_hash="demo_resident_hash_005",
            zone="Zone Gamma - Valley Creek",
            status=CheckInStatus.UNABLE_TO_RESPOND,
            assistance_notes="Neighbor reported resident is out of town.",
            submitted_at=now - timedelta(minutes=45)
        ),
    ]
    for c in checkins:
        db.add(c)
    db.commit()

    # 4. Seed Initial Simulated Notifications
    logger.info("Seeding initial simulated notifications...")
    notifications = [
        SimulatedNotification(
            alert_id=published_alert.id,
            recipient_pseudonym="Resident #101 (Riverfront)",
            recipient_zone="Zone Alpha - Riverfront",
            channel="SIMULATED_SMS",
            payload=f"[DEMO SIMULATION] {published_alert.title}: {published_alert.message}",
            status=NotificationStatus.SENT,
            attempt_count=1,
            max_retries=3,
            queued_at=now - timedelta(hours=2, minutes=45),
            sent_at=now - timedelta(hours=2, minutes=44),
            is_simulated=True
        ),
        SimulatedNotification(
            alert_id=published_alert.id,
            recipient_pseudonym="Resident #102 (Riverfront)",
            recipient_zone="Zone Alpha - Riverfront",
            channel="SIMULATED_SMS",
            payload=f"[DEMO SIMULATION] {published_alert.title}: {published_alert.message}",
            status=NotificationStatus.SENT,
            attempt_count=2,  # Retried once before success
            max_retries=3,
            last_error="Simulated network hiccup on attempt #1 (recovered)",
            queued_at=now - timedelta(hours=2, minutes=45),
            sent_at=now - timedelta(hours=2, minutes=40),
            is_simulated=True
        ),
        SimulatedNotification(
            alert_id=published_alert.id,
            recipient_pseudonym="Resident #103 (Riverfront)",
            recipient_zone="Zone Alpha - Riverfront",
            channel="SIMULATED_SMS",
            payload=f"[DEMO SIMULATION] {published_alert.title}: {published_alert.message}",
            status=NotificationStatus.QUEUED,
            attempt_count=0,
            max_retries=3,
            queued_at=now - timedelta(minutes=5),
            is_simulated=True
        ),
    ]
    for n in notifications:
        db.add(n)
    db.commit()

    logger.info("Demo database seeded successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    db.close()
