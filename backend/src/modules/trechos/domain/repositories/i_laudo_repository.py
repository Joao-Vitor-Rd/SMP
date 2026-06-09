from abc import ABC, abstractmethod
from typing import Optional

from datetime import datetime
from src.modules.trechos.domain.entities.laudo import Laudo


class ILaudoRepository(ABC):

    @abstractmethod
    def create(
        self,
        responsavel: str,
        data: datetime,
        colaboradores_ids: list[int]
    ) -> Laudo:
        pass

    @abstractmethod
    def list_all(self) -> list[Laudo]:
        pass

    @abstractmethod
    def find_by_id(self, laudo_id: int) -> Optional[Laudo]:
        pass