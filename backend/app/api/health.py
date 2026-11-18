from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.worker.queue import is_redis_healthy
from backend.app.schemas import HealthResponse

router = APIRouter(tags=["Health & Monitoring"])

@router.get("/health/live")
def liveness():
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "app": settings.PROJECT_NAME
    }

@router.get("/health/ready", response_model=HealthResponse)
def readiness(response: Response, db: Session = Depends(get_db)):
    dependencies = {}
    is_healthy = True

    # 1. Check Database
    try:
        db.execute(text("SELECT 1"))
        dependencies["database"] = "healthy"
    except Exception as e:
        dependencies["database"] = f"unhealthy: {str(e)}"
        is_healthy = False

    # 2. Check Redis
    if is_redis_healthy():
        dependencies["redis"] = "healthy"
    else:
        dependencies["redis"] = "degraded (fallback to in-memory queue)"
        # Note: In demo resilience mode, memory queue fallback keeps app functional

    overall_status = "ready" if is_healthy else "unready"
    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        dependencies=dependencies
    )

@router.get("/metrics")
def get_metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
