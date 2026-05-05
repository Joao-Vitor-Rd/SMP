from abc import ABC, abstractmethod

from src.modules.fotos.domain.entities.fotos import Foto


class IFotoRepository(ABC):
    @abstractmethod
    def save(self, foto: Foto) -> Foto:
        raise NotImplementedError