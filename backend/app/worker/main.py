import logging
import signal
import sys
import time

from backend.app.core.database import SessionLocal
from backend.app.worker.queue import pop_notification_job, is_worker_paused
from backend.app.worker.processor import process_single_notification_job

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [Worker] %(message)s"
)
logger = logging.getLogger("worker")

_running = True

def handle_exit(signum, frame):
    global _running
    logger.info(f"Received exit signal {signum}. Shutting down worker gracefully...")
    _running = False

signal.signal(signal.SIGINT, handle_exit)
signal.signal(signal.SIGTERM, handle_exit)

def run_worker_loop():
    logger.info("LastMile Lifeline Simulated Notification Worker started.")
    logger.info("Listening for queued alert notification jobs...")
    
    while _running:
        if is_worker_paused():
            logger.debug("Worker is paused via control toggle. Sleeping...")
            time.sleep(1)
            continue

        job = pop_notification_job(timeout=1)
        if not job:
            continue

        db = SessionLocal()
        try:
            logger.info(f"Processing notification job: {job}")
            process_single_notification_job(job, db)
        except Exception as e:
            logger.error(f"Error processing job {job}: {e}", exc_info=True)
        finally:
            db.close()

    logger.info("Worker stopped cleanly.")

if __name__ == "__main__":
    run_worker_loop()
