import redis.asyncio as redis
import os

class RedisClient:
    _instance = None

    @classmethod
    async def get_client(cls):
        if cls._instance is None:
            cls._instance = redis.from_url(
                os.getenv("REDIS_URL", "redis://localhost:6379"),
                encoding="utf-8",
                decode_responses=True
            )
        return cls._instance

    @classmethod
    async def close_client(cls):
        if cls._instance:
            await cls._instance.close()
            cls._instance = None