from abc import ABC, abstractmethod

from src.modules.trechos.domain.entities.trecho import Trecho


class ITrechoRepository(ABC):
    @abstractmethod
    def create_with_fotos(self, foto_ids: list[int]) -> Trecho:
        raise NotImplementedError
