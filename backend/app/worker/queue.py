import json
import logging
import time
from typing import Optional, Dict, Any, List
import redis

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback memory queue if Redis is temporarily unavailable in non-Docker testing
_memory_queue: List[str] = []
_memory_paused: bool = False

def get_redis_client() -> Optional[redis.Redis]:
    try:
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        r.ping()
        return r
    except Exception as e:
        logger.warning(f"Redis not available at {settings.REDIS_URL}: {e}. Operating in resilient memory mode.")
        return None

def is_redis_healthy() -> bool:
    try:
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
        r.ping()
        return True
    except Exception:
        return False

def push_notification_job(job_data: Dict[str, Any]) -> bool:
    payload = json.dumps(job_data)
    r = get_redis_client()
    if r:
        try:
            r.rpush(settings.WORKER_QUEUE_NAME, payload)
            return True
        except Exception as e:
            logger.error(f"Error pushing job to Redis: {e}")
            _memory_queue.append(payload)
            return True
    else:
        _memory_queue.append(payload)
        return True

def pop_notification_job(timeout: int = 1) -> Optional[Dict[str, Any]]:
    r = get_redis_client()
    if r:
        try:
            # Check if paused
            if r.get("lastmile:worker:paused") == "true":
                return None
            res = r.blpop(settings.WORKER_QUEUE_NAME, timeout=timeout)
            if res:
                _, payload = res
                return json.loads(payload)
            return None
        except Exception as e:
            logger.error(f"Error popping job from Redis: {e}")
            return None
    else:
        global _memory_paused
        if _memory_paused or not _memory_queue:
            return None
        payload = _memory_queue.pop(0)
        return json.loads(payload)

def get_queue_length() -> int:
    r = get_redis_client()
    if r:
        try:
            return r.llen(settings.WORKER_QUEUE_NAME)
        except Exception:
            return 0
    return len(_memory_queue)

def set_worker_paused(paused: bool) -> bool:
    global _memory_paused
    _memory_paused = paused
    r = get_redis_client()
    if r:
        try:
            r.set("lastmile:worker:paused", "true" if paused else "false")
            return True
        except Exception as e:
            logger.error(f"Error toggling worker pause state in Redis: {e}")
    return True

def is_worker_paused() -> bool:
    r = get_redis_client()
    if r:
        try:
            val = r.get("lastmile:worker:paused")
            return val == "true"
        except Exception:
            return _memory_paused
    return _memory_paused
