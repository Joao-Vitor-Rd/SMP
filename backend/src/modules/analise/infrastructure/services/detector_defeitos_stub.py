from typing import List

from src.modules.analise.domain.entities.deteccao import Deteccao, DefeitoDNIT
from src.modules.analise.domain.services.i_detector_defeitos import IDetectorDefeitos
from src.modules.fotos.domain.entities.fotos import Foto

_DEFEITOS = list(DefeitoDNIT)
_SEVERIDADES = ["Baixa", "Média", "Alta"]


class DetectorDefeitosStub(IDetectorDefeitos):
    """Detector determinístico para desenvolvimento/testes.

    Gera uma detecção por foto, variando defeito, severidade e confiança de forma
    estável a partir do id da foto. A faixa de confiança (0.70..0.99) inclui casos
    abaixo de 0.85 para exercitar o alerta de "revisão manual" do frontend.
    """

    def detect(self, fotos: List[Foto]) -> List[Deteccao]:
        deteccoes: List[Deteccao] = []
        for index, foto in enumerate(fotos):
            seed = foto.id if foto.id is not None else index
            defeito = _DEFEITOS[seed % len(_DEFEITOS)]
            confidence = round(0.70 + (seed % 30) / 100.0, 2)
            severidade = _SEVERIDADES[seed % len(_SEVERIDADES)]
            deteccoes.append(
                Deteccao(
                    defeito=defeito,
                    confidence_score=confidence,
                    severidade=severidade,
                    observacao=None,
                    imagem_id=foto.id,
                    revisado_manualmente=False,
                )
            )
        return deteccoes
