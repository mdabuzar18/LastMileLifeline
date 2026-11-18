from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field
from backend.app.models import UserRole, AlertSeverity, AlertStatus, CheckInStatus, NotificationStatus

# --- User Schemas ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Alert Schemas ---
class AlertCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=5)
    zone: str = Field(..., min_length=2, max_length=100)
    severity: AlertSeverity = AlertSeverity.MEDIUM

class AlertUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    message: Optional[str] = Field(None, min_length=5)
    zone: Optional[str] = Field(None, min_length=2, max_length=100)
    severity: Optional[AlertSeverity] = None

class AlertOut(BaseModel):
    id: int
    title: str
    message: str
    zone: str
    severity: AlertSeverity
    status: AlertStatus
    
    created_by_id: int
    approved_by_id: Optional[int] = None
    published_by_id: Optional[int] = None
    closed_by_id: Optional[int] = None

    created_by: Optional[UserOut] = None
    approved_by: Optional[UserOut] = None
    published_by: Optional[UserOut] = None
    closed_by: Optional[UserOut] = None

    created_at: datetime
    approved_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- CheckIn Schemas ---
class CheckInCreate(BaseModel):
    alert_id: int
    resident_identifier: str = Field(..., min_length=3, max_length=100, description="Fictional resident code or pseudonym")
    zone: str = Field(..., min_length=2, max_length=100)
    status: CheckInStatus
    assistance_notes: Optional[str] = Field(None, max_length=500)

class CheckInOut(BaseModel):
    id: int
    alert_id: int
    resident_id_hash: str
    zone: str
    status: CheckInStatus
    assistance_notes: Optional[str] = None
    submitted_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ZoneSummary(BaseModel):
    zone: str
    safe_count: int = 0
    need_assistance_count: int = 0
    unable_to_respond_count: int = 0
    total: int = 0

class AlertCheckInAggregate(BaseModel):
    alert_id: int
    alert_title: str
    alert_zone: str
    alert_severity: AlertSeverity
    alert_status: AlertStatus
    total_checkins: int
    safe_total: int
    need_assistance_total: int
    unable_to_respond_total: int
    zones: List[ZoneSummary]
    recent_assistance_requests: List[CheckInOut]

# --- Notification Schemas ---
class SimulatedNotificationOut(BaseModel):
    id: int
    alert_id: int
    recipient_pseudonym: str
    recipient_zone: str
    channel: str
    payload: str
    status: NotificationStatus
    attempt_count: int
    max_retries: int
    last_error: Optional[str] = None
    queued_at: datetime
    sent_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    is_simulated: bool

    class Config:
        from_attributes = True

class NotificationQueueStats(BaseModel):
    total_queued: int
    total_processing: int
    total_sent: int
    total_failed: int
    worker_running: bool
    recent_jobs: List[SimulatedNotificationOut]

# --- Health Schemas ---
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    environment: str
    dependencies: Dict[str, str]
