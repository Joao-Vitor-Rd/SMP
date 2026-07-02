from abc import ABC, abstractmethod
from typing import Optional

from datetime import datetime
from src.modules.trechos.domain.entities.laudo import Laudo





class ILaudoRepository(ABC):

    @abstractmethod
    def create(
        self,
        responsavel: str,
        credencial_responsavel: str,
        data: datetime,
        colaboradores_ids: list[int],
        resumo: dict[str, int]
    ) -> Laudo:
        pass

    @abstractmethod
    def update(
        self,
        laudo_id: int,
        responsavel: str,
        credencial_responsavel: str,
        data: datetime,
        colaboradores_ids: list[int],
        resumo: dict[str, int],
    ) -> Optional[Laudo]:
        pass

    @abstractmethod
    def list_all(self) -> list[Laudo]:
        pass

    @abstractmethod
    def list_by_usuario(self, usuario_id: int) -> list[Laudo]:
        pass

    @abstractmethod
    def find_by_id(self, laudo_id: int) -> Optional[Laudo]:
        pass

    @abstractmethod
    def publicar(self, laudo_id: int, resumo: dict) -> Optional[dict]:
        pass