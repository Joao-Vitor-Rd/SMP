import os

# Pool arq compartilhado para enfileiramento a partir da API.
# Os imports do `arq` são lazy para que a API possa importar este módulo
# mesmo em ambientes onde o `arq` ainda não esteja instalado.
_pool = None


def get_redis_settings():
    from arq.connections import RedisSettings

    settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))

    # Tunables to survive transient DNS/network hiccups in containers.
    settings.conn_timeout = float(os.getenv("ARQ_REDIS_CONN_TIMEOUT", "5"))
    settings.conn_retries = int(os.getenv("ARQ_REDIS_CONN_RETRIES", "20"))
    settings.conn_retry_delay = float(os.getenv("ARQ_REDIS_CONN_RETRY_DELAY", "1"))

    return settings


async def get_arq_pool():
    global _pool
    if _pool is None:
        from arq import create_pool

        _pool = await create_pool(get_redis_settings())
    return _pool


async def close_arq_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
