from abc import ABC, abstractmethod
from datetime import datetime
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.domain.entities.trecho import Trecho


class ITrechoRepository(ABC):
    @abstractmethod
    def create_with_fotos(
        self,
        foto_ids: list[int],
        responsavel_tecnico: str | None = None,
        defeitos: dict | None = None,
        responsavel_id: int | None = None,
        classificacao_qualidade: str | None = None,
    ) -> Trecho:
        raise NotImplementedError

    @abstractmethod
    def list_all(
        self,
        bbox_filter: TrechoBoundingBoxFilterDTO | None = None,
        cidade: str | None = None,
        uf: str | None = None,
        responsavel_tecnico: str | None = None,
        classificacao_qualidade: str | None = None,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
        responsavel_id: int | None = None,
        page: int | None = None,
        limit: int | None = None,
    ) -> tuple[list[Trecho], int]:
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, id_trecho: str) -> Trecho | None:
        raise NotImplementedError

    @abstractmethod
    def update(self, id_trecho: str, update_data: dict) -> Trecho | None:
        raise NotImplementedError
