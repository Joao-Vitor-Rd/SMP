from abc import ABC, abstractmethod
from typing import List

from src.modules.analise.domain.entities.deteccao import Deteccao


class IDeteccaoRepository(ABC):

    @abstractmethod
    def replace_for_inspecao(self, inspecao_id: int, deteccoes: List[Deteccao]) -> List[Deteccao]:
        """Substitui o conjunto de detecções de uma inspeção e retorna o persistido."""
        ...

    @abstractmethod
    def list_by_inspecao(self, inspecao_id: int) -> List[Deteccao]:
        ...
