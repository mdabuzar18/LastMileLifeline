# LastMile Lifeline 🛡️

> **IMPORTANT SAFETY NOTICE: DEMO & LEARNING SIMULATION ONLY**  
> **NOT FOR REAL EMERGENCIES, NOT AN EMERGENCY-ALERT BROADCASTER, AND NOT A 911/DISPATCH REPLACEMENT.**  
> This software is a pedagogical full-stack prototype demonstrating resilient queue architecture, role-based authorization, mock notification backoff/retries, and health telemetry. It **does not** connect to cellular emergency networks (WEA/EAS), commercial SMS gateways, or public emergency services. All recipients, zones, and check-ins are purely fictional and handled locally.

---

## 1. Project Purpose & Architecture

**LastMile Lifeline** coordinates localized disaster-response training exercises:
1. **Authorized Coordinators** author structured simulated alerts for fictional zones (e.g., riverfront flash flood, ridge smoke advisory).
2. **Designated Approvers** review drafts and publish them, which enqueues simulated notification tasks into a Redis-backed queue.
3. **A Resilient Background Worker** consumes notification jobs, updates delivery states (`QUEUED`, `PROCESSING`, `SENT (Simulated)`, `FAILED`), and executes exponential retry backoff when simulated network drops occur.
4. **Residents** submit lightweight check-ins from any mobile or desktop browser (`Safe`, `Need Assistance`, or `Unable to Respond`), protected against accidental duplicate count inflation.
5. **Field Responders** view live, anonymized aggregate check-ins broken down by fictional zone without exposing personal addresses or PII.
6. **DevOps & Operations Engineers** monitor liveness, dependency readiness (`/health/ready`), and Prometheus metrics (`/metrics`) with pre-configured Grafana dashboards.

### System Architecture Diagram

```
                                  +-----------------------------+
                                  | React 18 + Vite + TS Client |
                                  |   (Tailwind & Lucide UI)    |
                                  +--------------+--------------+
                                                 | HTTP / JSON
                                                 v
                                  +-----------------------------+
                                  |    FastAPI Backend API      |
                                  |  - Role-based JWT Auth      |
                                  |  - Alert State Machine      |
                                  |  - Check-in Deduplication   |
                                  |  - Prometheus Instrumentation|
                                  +------+---------------+------+
                                         |               |
                         SQLAlchemy ORM  |               |  Queue Enqueue
                                         v               v
                   +------------------------+   +-------------------+
                   |   PostgreSQL / SQLite  |   |    Redis Queue    |
                   |   (Seed Users, Alerts, |   | (Task buffer and  |
                   |  Check-ins, Delivery)  |   |  pause toggles)   |
                   +-----------+------------+   +---------+---------+
                               ^                          |
                               | Updates status & retries | Job pop
                               +--------------------------+
                                         |
                               +---------+---------+
                               | Resilient Worker  |
                               | Background Daemon |
                               +-------------------+
                                         |
                                         v
                         +-------------------------------+
                         |    Prometheus & Grafana       |
                         |   Telemetry & Health Probes   |
                         +-------------------------------+
```

---

## 2. Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Vitest.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT.
- **Database:** PostgreSQL 16 (production/Docker) with SQLite fallback for immediate local testing.
- **Queue & Storage:** Redis 7 with in-memory resilient fallback for zero-dependency standalone execution.
- **Monitoring & Metrics:** Prometheus client (`/metrics`) and pre-provisioned Grafana dashboards.
- **Containerization & CI:** Docker Compose, multi-stage Dockerfiles, and GitHub Actions CI.

---

## 3. Demo Accounts & Seeded Credentials

The system seeds four fictional accounts representing distinct operational tiers:

| Role | Demo Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Coordinator** | `coordinator@lastmile.demo` | `coordinator123` | Create draft alerts, edit pending drafts, submit for approval, close active alerts. |
| **Approver** | `approver@lastmile.demo` | `approver123` | Review pending alerts, authorize & publish alerts (triggers mock notification enqueue), close alerts. |
| **Responder** | `responder@lastmile.demo` | `responder123` | View aggregate check-in statistics by zone, triage non-PII assistance requests. |
| **Resident** | `resident@lastmile.demo` | `resident123` | Submit and update personal safety check-in status for active alerts. |

*Quick-Login Feature: The application includes a one-click demo role switcher in the top navigation bar for seamless role switching during evaluations.*

---

## 4. Quick Start (Local Development)

### Option A: Local Bare-Metal (Fastest for testing)

#### 1. Backend Setup
```bash
# In project root:
python3.12 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Run backend API server (runs on SQLite and memory queue by default):
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Worker Setup (Optional separate terminal for background processing)
```bash
source venv/bin/activate
PYTHONPATH=. python -m backend.app.worker.main
```
*(Note: You can also use the UI's "Step 1 Job" button to process jobs step-by-step without running a separate worker).*

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Option B: Docker Compose (Full Stack with Postgres, Redis, Prometheus & Grafana)

```bash
# Build and launch all services:
docker compose up --build -d

# Check service health:
./scripts/deploy_check.sh http://localhost:8000
```

#### Running Endpoints:
- **Web Application:** `http://localhost:3000`
- **FastAPI Documentation:** `http://localhost:8000/docs`
- **Readiness Health Check:** `http://localhost:8000/health/ready`
- **Prometheus Metrics:** `http://localhost:8000/metrics`
- **Prometheus UI:** `http://localhost:9090`
- **Grafana Dashboard:** `http://localhost:3001` (login: `admin` / `admin`)

---

## 5. Walkthrough: Demonstrating Queue Resilience & Retries

To demonstrate message queuing, worker pause, and retry recovery in real time:

1. **Pause Worker:**
   - Go to the **Queue & Worker Inspector** tab in the UI.
   - Click **"Pause Worker (Demo Mode)"**. The badge switches to `PAUSED`.
2. **Publish an Alert:**
   - Switch to the **Coordinator** role and click **"Create Draft Alert"** (or use an existing draft).
   - Click **"Submit for Approval"**.
   - Switch to the **Approver** role under **Approver Review**.
   - Click **"Authorize & Publish Alert"**.
3. **Observe Buffer Queueing:**
   - Return to the **Queue & Worker Inspector** tab.
   - Notice the **Queued in Buffer** count has increased (e.g. 6 simulated recipient messages waiting).
4. **Resume & Observe Recovery:**
   - Click **"Resume Worker (Drain Queue)"** (or click **"Step 1 Job"**).
   - Observe worker threads processing jobs.
   - Intentionally injected transient network timeouts trigger retry attempts (`Attempt 1/3 -> 2/3`) before safely landing in `Sent (Simulated)`.
   - The aggregate counters update in real time.

---

## 6. Deduplication Behavior (Preventing Skewed Headcounts)

### Why it matters
In disaster situations, residents under stress may submit multiple check-ins, refresh their browser, or transition from needing aid to being safe. Naive counting creates duplicate rows that falsely inflate survivor counts and mislead responders.

### The LastMile Lifeline Solution
- Every resident check-in generates a deterministic hash from the fictional household identifier and the alert ID (`alert_id` + `resident_identifier`).
- A database-level constraint `(alert_id, resident_id_hash)` guarantees that subsequent submissions update the resident's current status and assistance notes rather than creating duplicate records.
- The UI explicitly informs the resident: *"Your check-in status was updated successfully. Thank you for keeping responders informed."*
- Headcount totals remain accurate and stable.

---

## 7. Running Automated Tests & Quality Checks

### Backend Unit & Integration Tests (14 passing tests)
```bash
source venv/bin/activate
PYTHONPATH=. pytest backend/tests/ -v
```
Tests cover:
- Role permission enforcement (Coordinators can create drafts; unauthorized roles receive `403 Forbidden`).
- Alert lifecycle state transitions (`DRAFT` -> `PENDING_APPROVAL` -> `PUBLISHED` -> `CLOSED`).
- Approver role checks (Coordinators cannot approve their own drafts).
- Resident check-in deduplication and upsert idempotency.
- Responder zone aggregation logic.
- Notification worker retries, backoff delay, and max-retry failure transitions.
- Liveness, readiness (`/health/ready`), and Prometheus metrics instrumentation.

### Frontend Unit Tests & Production Build
```bash
cd frontend
npm run test   # Vitest suite
npm run build  # TypeScript strict typecheck & Vite bundle
```

---

## 8. Deployment Verification & Rollback Strategy

### Verification Script
Run the automated verification script against any deployed instance:
```bash
./scripts/deploy_check.sh http://localhost:8000
```
This script checks:
1. HTTP Liveness `/health/live`
2. Dependency Readiness `/health/ready` (PostgreSQL query and Redis ping)
3. Prometheus metrics stream `/metrics`
4. Seeded database integrity `/api/v1/auth/demo-accounts`

### Rollback Strategy (Documented Scope)
Because this is a learning and local demonstration prototype, enterprise multi-region canary routing is not present. Instead, safe rollback is performed via:
1. **Container Rollback:**
   ```bash
   # Stop failing deployment:
   docker compose stop backend worker
   # Revert to previous image or checkout previous commit:
   git checkout <PREVIOUS_COMMIT>
   docker compose up -d --build
   ```
2. **Database Reversion:**
   Database schema initialization is additive and backward-compatible. If an unrecoverable schema state occurs, wipe and re-seed the test volume:
   ```bash
   docker compose down -v
   docker compose up -d
   ```

---

## 9. Engineering Limitations & Future Extensions

- **Mock Provider Only:** All alerts are stored in the database as mock jobs; real cellular or telecommunication providers are intentionally omitted.
- **Fictional Geolocation:** Check-ins use high-level fictional zones rather than high-precision GPS coordinates to protect user privacy and avoid mapping real-world infrastructure.
- **Worker Scalability:** The current worker handles single-process polling. For massive multi-region throughput, Celery, ARQ, or Kafka with distributed worker autoscaling could be introduced.
- **Authentication Scope:** Uses demo JWTs with fixed salt hashing. Production deployments should integrate OAuth 2.0 / OIDC (e.g., Keycloak or Auth0) with multi-factor authentication (MFA).

---

## 10. License

Released under the **MIT License** for education, training simulations, and architectural evaluation.
