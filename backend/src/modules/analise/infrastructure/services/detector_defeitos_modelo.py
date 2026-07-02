from typing import List, Optional

from src.modules.analise.domain.entities.deteccao import Deteccao
from src.modules.analise.domain.services.i_detector_defeitos import IDetectorDefeitos
from src.modules.fotos.domain.entities.fotos import Foto
from src.modules.fotos.domain.repositories.i_foto_storage import IFotoStorage


class DetectorDefeitosModelo(IDetectorDefeitos):
    """Ponto de extensão para integração com modelo de IA local."""

    def __init__(self, storage: Optional[IFotoStorage] = None, model=None):
        self.storage = storage
        self.model = model

    def detect(self, fotos: List[Foto]) -> List[Deteccao]:
        raise NotImplementedError(
            "Integração com o modelo de IA ainda não implementada. "
            "Defina DETECTOR_DEFEITOS=stub para usar o detector determinístico."
        )
