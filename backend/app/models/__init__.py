from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    COORDINATOR = "coordinator"
    APPROVER = "approver"
    RESPONDER = "responder"
    RESIDENT = "resident"

class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    PUBLISHED = "published"
    CLOSED = "closed"

class CheckInStatus(str, enum.Enum):
    SAFE = "safe"
    NEED_ASSISTANCE = "need_assistance"
    UNABLE_TO_RESPOND = "unable_to_respond"

class NotificationStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.RESIDENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    zone = Column(String(100), nullable=False)  # e.g., "Zone Alpha - Riverfront"
    severity = Column(Enum(AlertSeverity), nullable=False, default=AlertSeverity.MEDIUM)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.DRAFT)
    
    # Audit trail
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    published_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    published_by = relationship("User", foreign_keys=[published_by_id])
    closed_by = relationship("User", foreign_keys=[closed_by_id])
    
    checkins = relationship("CheckIn", back_populates="alert", cascade="all, delete-orphan")
    notifications = relationship("SimulatedNotification", back_populates="alert", cascade="all, delete-orphan")

class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id_hash = Column(String(64), nullable=False, index=True)  # Fictional pseudo identifier
    zone = Column(String(100), nullable=False)
    status = Column(Enum(CheckInStatus), nullable=False)
    assistance_notes = Column(Text, nullable=True)
    
    submitted_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    alert = relationship("Alert", back_populates="checkins")

    # Prevent duplicate records inflating count per alert & resident
    __table_args__ = (
        UniqueConstraint("alert_id", "resident_id_hash", name="uq_alert_resident"),
    )

class SimulatedNotification(Base):
    __tablename__ = "simulated_notifications"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_pseudonym = Column(String(100), nullable=False)  # e.g. "Resident #4092 (Simulated)"
    recipient_zone = Column(String(100), nullable=False)
    channel = Column(String(50), nullable=False, default="SIMULATED_SMS")
    payload = Column(Text, nullable=False)
    status = Column(Enum(NotificationStatus), nullable=False, default=NotificationStatus.QUEUED)
    attempt_count = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    last_error = Column(Text, nullable=True)
    
    queued_at = Column(DateTime(timezone=True), default=utc_now)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    is_simulated = Column(Boolean, nullable=False, default=True)

    alert = relationship("Alert", back_populates="notifications")
