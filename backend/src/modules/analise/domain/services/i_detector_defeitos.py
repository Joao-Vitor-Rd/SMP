from abc import ABC, abstractmethod
from typing import List

from src.modules.analise.domain.entities.deteccao import Deteccao
from src.modules.fotos.domain.entities.fotos import Foto


class IDetectorDefeitos(ABC):
    """Detector de defeitos DNIT 005/2003-TER a partir de fotos do trecho."""

    @abstractmethod
    def detect(self, fotos: List[Foto]) -> List[Deteccao]:
        """Analisa as fotos e retorna detecções com `confidence_score` em 0..1."""
        ...
