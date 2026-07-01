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
    def list_by_inspecao_id(self, inspecao_id: int) -> list[Foto]:
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, foto_id: int) -> Foto | None:
        raise NotImplementedError

    @abstractmethod
    def update_localizacao(self, foto_id: int, latitude: float, longitude: float) -> Foto | None:
        raise NotImplementedError

    @abstractmethod
    def associate_to_trecho(self, foto_ids: list[int], trecho_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def associate_to_laudo(self, foto_ids: list[int], laudo_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def find_by_path_or_name(self, identifier: str) -> Foto | None:
        """Retorna uma foto buscando por `caminho_arquivo`, `nome_aquivo` ou `nome_original_arquivo`.

        Usado para compatibilidade quando o cliente envia o identificador como string
        (ex: nome do objeto no storage) em vez do id inteiro.
        """
        raise NotImplementedError