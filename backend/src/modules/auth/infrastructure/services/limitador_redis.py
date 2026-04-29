from src.modules.auth.domain.repositories.i_limitador_tentativas import LimitadorDeTentativas
from redis.asyncio import Redis
from datetime import datetime, timezone, timedelta

class LimitadorRedis(LimitadorDeTentativas):
    def __init__(self, client: Redis):
        self.redis = client
        self.limite = 5
        self.expiracao = 900

    async def esta_bloqueado(self, identificador: str) -> bool:
        valor = await self.redis.get(f"brute_force:{identificador}")
        return valor is not None and int(valor) >= self.limite

    async def registrar_tentativa(self, identificador: str) -> int:
        chave = f"brute_force:{identificador}"
        novo_valor = await self.redis.incr(chave)
        if novo_valor == 1:
            await self.redis.expire(chave, self.expiracao)
        return novo_valor

    async def obter_tentativas(self, identificador: str) -> int:
        valor = await self.redis.get(f"brute_force:{identificador}")
        return int(valor) if valor is not None else 0

    async def obter_proxima_tentativa(self, identificador: str):
        chave = f"brute_force:{identificador}"
        ttl = await self.redis.ttl(chave)

        if ttl is None or ttl < 0:
            return None

        return datetime.now(timezone.utc) + timedelta(seconds=ttl)

    async def resetar(self, identificador: str) -> None:
        await self.redis.delete(f"brute_force:{identificador}")