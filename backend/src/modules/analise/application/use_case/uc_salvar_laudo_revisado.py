from src.modules.analise.application.dtos.analise_dto import DeteccaoDTO, LaudoAnaliseDTO
from src.modules.analise.domain.entities.deteccao import Deteccao
from src.modules.analise.domain.repositories.i_deteccao_repository import IDeteccaoRepository


class SalvarLaudoRevisadoUseCase:
    """Persiste o laudo revisado pelo usuário (PUT /laudo)."""

    def __init__(self, deteccao_repository: IDeteccaoRepository):
        self.deteccao_repository = deteccao_repository

    def execute(self, inspecao_id: int, dto: LaudoAnaliseDTO) -> LaudoAnaliseDTO:
        deteccoes = [
            Deteccao(
                inspecao_id=inspecao_id,
                defeito=d.defeito,
                confidence_score=d.confidence_score,
                severidade=d.severidade,
                observacao=d.observacao,
                imagem_id=d.imagem_id if isinstance(d.imagem_id, int) else None,
                revisado_manualmente=d.revisado_manualmente,
            )
            for d in dto.deteccoes
        ]

        salvas = self.deteccao_repository.replace_for_inspecao(inspecao_id, deteccoes)

        return LaudoAnaliseDTO(
            inspecao_id=inspecao_id,
            deteccoes=[DeteccaoDTO.model_validate(d) for d in salvas],
            observacoes_gerais=dto.observacoes_gerais,
        )
