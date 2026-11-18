from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import time

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP Requests",
    ["method", "endpoint", "status"]
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP Request Latency in seconds",
    ["method", "endpoint"]
)

NOTIFICATIONS_ENQUEUED = Counter(
    "simulated_notifications_enqueued_total",
    "Total simulated notifications pushed to the queue",
    ["zone", "channel"]
)

NOTIFICATIONS_DELIVERED = Counter(
    "simulated_notifications_delivered_total",
    "Total simulated notifications successfully delivered",
    ["channel"]
)

NOTIFICATIONS_FAILED = Counter(
    "simulated_notifications_failed_total",
    "Total simulated notifications marked failed after max retries",
    ["channel"]
)

NOTIFICATIONS_RETRIED = Counter(
    "simulated_notifications_retried_total",
    "Total simulated notification retry attempts triggered",
    ["channel"]
)

CHECKINS_TOTAL = Counter(
    "resident_checkins_total",
    "Total resident check-ins recorded",
    ["status", "zone"]
)

ACTIVE_ALERTS = Gauge(
    "active_alerts_total",
    "Total currently active (published) alerts"
)

class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip metrics endpoint itself to avoid recursion noise
        if request.url.path.startswith("/metrics"):
            return await call_next(request)

        start_time = time.time()
        endpoint = request.url.path
        method = request.method
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=response.status_code).inc()
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
            return response
        except Exception as e:
            duration = time.time() - start_time
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=500).inc()
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
            raise e
