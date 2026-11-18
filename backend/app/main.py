import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.core.metrics import PrometheusMiddleware
from backend.app.db.init_db import init_db
from backend.app.api import auth, alerts, checkins, notifications, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("lastmile_lifeline")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed data exist
    logger.info("Initializing LastMile Lifeline database and mock data...")
    db = SessionLocal()
    try:
        init_db(db)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}", exc_info=True)
    finally:
        db.close()
    yield
    logger.info("Shutting down LastMile Lifeline API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    **SIMULATED PROTOTYPE ONLY - NOT FOR REAL EMERGENCIES**
    LastMile Lifeline: Community disaster-response coordination demo with resilient simulated messaging,
    role-based authorization, resident check-ins, responder aggregates, and health monitoring.
    """,
    lifespan=lifespan
)

# Enable Prometheus Metrics Middleware
app.add_middleware(PrometheusMiddleware)

# Enable CORS for local Vite development & container ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(checkins.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "DEMO_SIMULATION_ONLY",
        "notice": "THIS IS A PROTOTYPE / LEARNING PROJECT. DO NOT USE FOR REAL EMERGENCIES.",
        "docs": "/docs",
        "health_live": "/health/live",
        "health_ready": "/health/ready",
        "metrics": "/metrics"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
