from typing import List, Optional

from src.modules.analise.domain.entities.deteccao import Deteccao
from src.modules.analise.domain.services.i_detector_defeitos import IDetectorDefeitos
from src.modules.fotos.domain.entities.fotos import Foto
from src.modules.fotos.domain.repositories.i_foto_storage import IFotoStorage


class DetectorDefeitosModelo(IDetectorDefeitos):
    """Adapter do modelo de IA real (ponto de integração).

    Implementação esperada:
      1. Para cada foto, carregar os bytes do MinIO via `self.storage`
         (`caminho_arquivo` -> conteúdo da imagem).
      2. Rodar o modelo de detecção de defeitos DNIT 005/2003-TER.
      3. Mapear cada predição para `Deteccao` (defeito da taxonomia,
         `confidence_score` normalizado em 0..1, `imagem_id=foto.id`).
    """

    def __init__(self, storage: Optional[IFotoStorage] = None, model=None):
        self.storage = storage
        self.model = model

    def detect(self, fotos: List[Foto]) -> List[Deteccao]:
        raise NotImplementedError(
            "Integração com o modelo de IA ainda não implementada. "
            "Defina DETECTOR_DEFEITOS=stub para usar o detector determinístico."
        )
