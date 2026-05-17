"""Testes unitários do limitador de tentativas usado no UC-02.

O `LoginUseCase` decide quando consultar ou registrar tentativas, enquanto
`LimitadorRedis` define o limite operacional: cinco falhas bloqueiam o IP e
configuram expiração de 15 minutos no Redis. Este teste usa um Redis fake em
memória para validar essa regra sem depender de infraestrutura externa.
"""

import asyncio

import pytest

from src.modules.auth.infrastructure.services.limitador_redis import LimitadorRedis


class FakeRedis:
    def __init__(self):
        self.valores = {}
        self.expiracoes = {}

    async def get(self, chave):
        return self.valores.get(chave)

    async def incr(self, chave):
        self.valores[chave] = int(self.valores.get(chave, 0)) + 1
        return self.valores[chave]

    async def expire(self, chave, segundos):
        self.expiracoes[chave] = segundos

    async def ttl(self, chave):
        return self.expiracoes.get(chave, -1)

    async def delete(self, chave):
        self.valores.pop(chave, None)
        self.expiracoes.pop(chave, None)


def run(coro):
    return asyncio.run(coro)


@pytest.mark.unit
@pytest.mark.sprint_01
@pytest.mark.us_02
class TestLimitadorRedis:
    """Cenários principais do bloqueio por tentativas incorretas."""

    def test_deve_bloquear_por_15_minutos_ao_alcancar_cinco_tentativas(self):
        redis = FakeRedis()
        limitador = LimitadorRedis(redis)
        identificador = "127.0.0.1"
        chave = f"brute_force:{identificador}"

        tentativas = [run(limitador.registrar_tentativa(identificador)) for _ in range(5)]

        assert tentativas == [1, 2, 3, 4, 5]
        assert redis.expiracoes[chave] == 900
        assert run(limitador.esta_bloqueado(identificador)) is True

    def test_deve_resetar_tentativas_do_identificador(self):
        redis = FakeRedis()
        limitador = LimitadorRedis(redis)
        identificador = "127.0.0.1"

        run(limitador.registrar_tentativa(identificador))
        run(limitador.resetar(identificador))

        assert run(limitador.obter_tentativas(identificador)) == 0
        assert run(limitador.esta_bloqueado(identificador)) is False
