from typing import Optional

from src.modules.analise.application.dtos.analise_dto import DeteccaoDTO, LaudoAnaliseDTO
from src.modules.analise.domain.repositories.i_deteccao_repository import IDeteccaoRepository


class BuscarLaudoAnaliseUseCase:
    """Busca as detecções já salvas/publicadas para uma inspeção (GET /{inspecao_id}/laudo).

    Usado pela tela de relatório para exibir o resultado da análise de IA
    sem precisar rodar a análise de novo — evita mostrar "Nenhuma análise
    executada ainda" para inspeções que já foram analisadas e publicadas.
    """

    def __init__(self, deteccao_repository: IDeteccaoRepository):
        self.deteccao_repository = deteccao_repository

    def execute(self, inspecao_id: int) -> Optional[LaudoAnaliseDTO]:
        deteccoes = self.deteccao_repository.list_by_inspecao(inspecao_id)
        if not deteccoes:
            return None

        return LaudoAnaliseDTO(
            inspecao_id=inspecao_id,
            deteccoes=[DeteccaoDTO.model_validate(d) for d in deteccoes],
            observacoes_gerais=None,
        )