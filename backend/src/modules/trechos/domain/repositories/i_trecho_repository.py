from abc import ABC, abstractmethod

from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.domain.entities.trecho import Trecho


class ITrechoRepository(ABC):
    @abstractmethod
    def create_with_fotos(self, foto_ids: list[int]) -> Trecho:
        raise NotImplementedError

    @abstractmethod
    def list_all(self, bbox_filter: TrechoBoundingBoxFilterDTO | None = None) -> list[Trecho]:
        raise NotImplementedError
