from abc import ABC, abstractmethod

from src.modules.trechos.domain.entities.laudo import Laudo


class ILaudoRepository(ABC):

    @abstractmethod
    def create(
        self,
        responsavel: str,
        usuarios_ids: list[int]
    ) -> Laudo:
        pass

    @abstractmethod
    def list_all(self) -> list[Laudo]:
        pass

    @abstractmethod
    def list_by_id(self) -> list[Laudo]:
        pass