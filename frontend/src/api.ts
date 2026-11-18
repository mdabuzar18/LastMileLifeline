import {
  Alert,
  AlertCheckInAggregate,
  CheckInCreate,
  HealthResponse,
  NotificationStats,
  SimulatedNotification,
  User
} from './types';

const API_BASE = '/api/v1';

let authToken: string | null = localStorage.getItem('lastmile_auth_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('lastmile_auth_token', token);
  } else {
    localStorage.removeItem('lastmile_auth_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async getDemoAccounts(): Promise<User[]> {
    return request<User[]>(`${API_BASE}/auth/demo-accounts`);
  },
  async login(email: string, password: string):Promise<{ access_token: string; user: User }> {
    return request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  async getCurrentUser(): Promise<User> {
    return request<User>(`${API_BASE}/auth/me`);
  },

  // Alerts
  async getAlerts(status?: string): Promise<Alert[]> {
    const query = status ? `?status=${status}` : '';
    return request<Alert[]>(`${API_BASE}/alerts${query}`);
  },
  async createAlert(data: { title: string; message: string; zone: string; severity: string }): Promise<Alert> {
    return request<Alert>(`${API_BASE}/alerts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateAlert(id: number, data: Partial<{ title: string; message: string; zone: string; severity: string }>): Promise<Alert> {
    return request<Alert>(`${API_BASE}/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async submitForApproval(id: number): Promise<Alert> {
    return request<Alert>(`${API_BASE}/alerts/${id}/submit-approval`, {
      method: 'POST',
    });
  },
  async approveAndPublish(id: number): Promise<Alert> {
    return request<Alert>(`${API_BASE}/alerts/${id}/approve-and-publish`, {
      method: 'POST',
    });
  },
  async closeAlert(id: number): Promise<Alert> {
    return request<Alert>(`${API_BASE}/alerts/${id}/close`, {
      method: 'POST',
    });
  },

  // Check-ins
  async getActiveAlerts(): Promise<Alert[]> {
    return request<Alert[]>(`${API_BASE}/checkins/active-alerts`);
  },
  async submitCheckIn(data: CheckInCreate): Promise<{ status: string; message: string }> {
    return request(`${API_BASE}/checkins`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getAlertAggregate(alertId: number): Promise<AlertCheckInAggregate> {
    return request<AlertCheckInAggregate>(`${API_BASE}/checkins/aggregate/${alertId}`);
  },

  // Simulated Notifications & Worker
  async getNotifications(alertId?: number): Promise<SimulatedNotification[]> {
    const query = alertId ? `?alert_id=${alertId}` : '';
    return request<SimulatedNotification[]>(`${API_BASE}/notifications${query}`);
  },
  async getNotificationStats(): Promise<NotificationStats> {
    return request<NotificationStats>(`${API_BASE}/notifications/stats`);
  },
  async toggleWorkerPause(paused: boolean): Promise<{ status: string; worker_paused: boolean; message: string }> {
    return request(`${API_BASE}/notifications/worker/pause`, {
      method: 'POST',
      body: JSON.stringify({ paused }),
    });
  },
  async processNextJob(): Promise<{ status: string; message?: string; job?: any; delivery_success?: boolean }> {
    return request(`${API_BASE}/notifications/process-next-job`, {
      method: 'POST',
    });
  },

  // Health
  async getHealthReadiness(): Promise<HealthResponse> {
    return request<HealthResponse>('/health/ready');
  },
};
