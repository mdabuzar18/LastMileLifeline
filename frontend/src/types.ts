export type UserRole = 'coordinator' | 'approver' | 'responder' | 'resident';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'draft' | 'pending_approval' | 'published' | 'closed';

export type CheckInStatus = 'safe' | 'need_assistance' | 'unable_to_respond';

export type NotificationStatus = 'queued' | 'processing' | 'sent' | 'failed';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Alert {
  id: number;
  title: string;
  message: string;
  zone: string;
  severity: AlertSeverity;
  status: AlertStatus;
  created_by_id: number;
  approved_by_id?: number | null;
  published_by_id?: number | null;
  closed_by_id?: number | null;
  created_by?: User;
  approved_by?: User;
  published_by?: User;
  closed_by?: User;
  created_at: string;
  approved_at?: string | null;
  published_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
}

export interface CheckInCreate {
  alert_id: number;
  resident_identifier: string;
  zone: string;
  status: CheckInStatus;
  assistance_notes?: string;
}

export interface CheckInOut {
  id: number;
  alert_id: number;
  resident_id_hash: string;
  zone: string;
  status: CheckInStatus;
  assistance_notes?: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface ZoneSummary {
  zone: string;
  safe_count: number;
  need_assistance_count: number;
  unable_to_respond_count: number;
  total: number;
}

export interface AlertCheckInAggregate {
  alert_id: number;
  alert_title: string;
  alert_zone: string;
  alert_severity: AlertSeverity;
  alert_status: AlertStatus;
  total_checkins: number;
  safe_total: number;
  need_assistance_total: number;
  unable_to_respond_total: number;
  zones: ZoneSummary[];
  recent_assistance_requests: CheckInOut[];
}

export interface SimulatedNotification {
  id: number;
  alert_id: number;
  recipient_pseudonym: string;
  recipient_zone: string;
  channel: string;
  payload: string;
  status: NotificationStatus;
  attempt_count: number;
  max_retries: number;
  last_error?: string | null;
  queued_at: string;
  sent_at?: string | null;
  failed_at?: string | null;
  is_simulated: boolean;
}

export interface NotificationStats {
  total_queued: number;
  total_processing: number;
  total_sent: number;
  total_failed: number;
  worker_running: boolean;
  recent_jobs: SimulatedNotification[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  dependencies: Record<string, string>;
}
