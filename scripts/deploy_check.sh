#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# LastMile Lifeline Post-Deployment Health Verification & Rollback Script
# ==============================================================================
# Scope Notice:
# This verification script checks service readiness and dependencies after
# deployment. In local and demo environments, rollback involves restarting previous
# container image tags or checking out the previous Git commit.
# ==============================================================================

TARGET_URL="${1:-http://localhost:8000}"
MAX_RETRIES=10
RETRY_INTERVAL=3

echo "=========================================================="
echo " Starting Post-Deployment Verification for LastMile Lifeline"
echo " Target Endpoint: ${TARGET_URL}"
echo "=========================================================="

echo "Step 1: Checking Liveness Probe (/health/live)..."
LIVENESS_STATUS=0
for ((i=1; i<=MAX_RETRIES; i++)); do
  if curl -sf "${TARGET_URL}/health/live" > /dev/null 2>&1; then
    echo "  [PASS] API Liveness check succeeded on attempt ${i}."
    LIVENESS_STATUS=1
    break
  fi
  echo "  [WAIT] Liveness check attempt ${i}/${MAX_RETRIES} failed. Retrying in ${RETRY_INTERVAL}s..."
  sleep "${RETRY_INTERVAL}"
done

if [ "${LIVENESS_STATUS}" -ne 1 ]; then
  echo "  [FAIL] Liveness check failed after ${MAX_RETRIES} attempts."
  echo ""
  echo ">>> ROLLBACK PROCEDURE <<<"
  echo "1. Stop the failing container or server:"
  echo "   docker compose stop backend worker"
  echo "2. Revert to previous image or commit:"
  echo "   git checkout HEAD~1 || docker compose down && docker compose up -d"
  echo "3. Check logs for startup failure:"
  echo "   docker compose logs backend"
  exit 1
fi

echo ""
echo "Step 2: Checking Readiness Probe & Database/Redis dependencies (/health/ready)..."
READY_STATUS=0
for ((i=1; i<=MAX_RETRIES; i++)); do
  READY_BODY=$(curl -sf "${TARGET_URL}/health/ready" 2>/dev/null || echo "")
  if [ -n "${READY_BODY}" ]; then
    echo "  [PASS] Readiness probe responded: ${READY_BODY}"
    READY_STATUS=1
    break
  fi
  echo "  [WAIT] Readiness probe attempt ${i}/${MAX_RETRIES} not ready yet..."
  sleep "${RETRY_INTERVAL}"
done

if [ "${READY_STATUS}" -ne 1 ]; then
  echo "  [FAIL] Readiness check failed: Service dependencies not healthy."
  exit 1
fi

echo ""
echo "Step 3: Checking Prometheus Metrics endpoint (/metrics)..."
if curl -sf "${TARGET_URL}/metrics" | grep -q "http_requests_total"; then
  echo "  [PASS] Prometheus metrics stream operational."
else
  echo "  [WARN] Metrics endpoint reachable but http_requests_total not yet observed."
fi

echo ""
echo "Step 4: Checking Demo Accounts Endpoint (/api/v1/auth/demo-accounts)..."
DEMO_ACCOUNTS=$(curl -sf "${TARGET_URL}/api/v1/auth/demo-accounts" 2>/dev/null || echo "")
if [[ "${DEMO_ACCOUNTS}" =~ "coordinator" ]]; then
  echo "  [PASS] Database seeding verified: Demo accounts accessible."
else
  echo "  [FAIL] Database seeding check failed: No coordinator account found."
  exit 1
fi

echo ""
echo "=========================================================="
echo " Deployment Verification Completed Successfully!"
echo " System is ready to handle simulated alerts and check-ins."
echo "=========================================================="
