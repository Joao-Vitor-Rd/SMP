from abc import ABC, abstractmethod

from src.modules.fotos.domain.entities.fotos import Foto


class IFotoRepository(ABC):
    @abstractmethod
    def save(self, foto: Foto) -> Foto:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Foto]:
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, foto_id: int) -> Foto | None:
        raise NotImplementedError

    @abstractmethod
    def update_localizacao(self, foto_id: int, latitude: float, longitude: float) -> Foto | None:
        raise NotImplementedError

    @abstractmethod
    def find_by_path_or_name(self, identifier: str) -> Foto | None:
        raise NotImplementedError