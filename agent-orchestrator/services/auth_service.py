import json
from typing import Optional

import redis

from config import settings

# Redis client for session storage
# Supports REDIS_URL (Upstash/production) or host/port (local)
if settings.redis_url:
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
else:
    redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        decode_responses=True,
    )


def store_session(session_id: str, token: str, username: str, user_id: int) -> None:
    """Store user session data in Redis with 24h TTL."""
    session_data = json.dumps({
        "token": token,
        "username": username,
        "user_id": user_id,
    })
    redis_client.setex(f"session:{session_id}", 86400, session_data)


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve user session data from Redis."""
    data = redis_client.get(f"session:{session_id}")
    if data:
        return json.loads(data)
    return None


def delete_session(session_id: str) -> None:
    """Delete a user session from Redis."""
    redis_client.delete(f"session:{session_id}")


def store_chat_history(session_id: str, messages: list) -> None:
    """Store conversation history in Redis."""
    redis_client.setex(
        f"chat:{session_id}",
        86400,
        json.dumps(messages),
    )


def get_chat_history(session_id: str) -> list:
    """Retrieve conversation history from Redis."""
    data = redis_client.get(f"chat:{session_id}")
    if data:
        return json.loads(data)
    return []
