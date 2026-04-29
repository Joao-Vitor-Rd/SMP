from abc import ABC, abstractmethod
from datetime import datetime

class LimitadorDeTentativas(ABC):
    @abstractmethod
    async def esta_bloqueado(self, identificador: str) -> bool:
        pass

    @abstractmethod
    async def registrar_tentativa(self, identificador: str) -> int:
        pass

    @abstractmethod
    async def obter_tentativas(self, identificador: str) -> int:
        pass

    @abstractmethod
    async def obter_proxima_tentativa(self, identificador: str) -> datetime | None:
        pass

    @abstractmethod
    async def resetar(self, identificador: str) -> None:
        pass