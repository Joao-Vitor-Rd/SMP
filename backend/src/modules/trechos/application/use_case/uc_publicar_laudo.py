from src.modules.trechos.application.dtos.laudo_dto import (
    LaudoPublicacaoCreateDTO,
    LaudoPublicadoDTO,
)
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository


class PublicarLaudoUseCase:
    def __init__(self, laudo_repository: ILaudoRepository):
        self.laudo_repository = laudo_repository

    def execute(self, laudo_id: int, dto: LaudoPublicacaoCreateDTO) -> LaudoPublicadoDTO:
        publicado = self.laudo_repository.publicar(laudo_id, dto.resumo.model_dump())
        if publicado is None:
            raise LookupError(f"Laudo {laudo_id} não encontrado.")

        return LaudoPublicadoDTO(
            id=publicado["id"],
            inspecao_id=laudo_id,
            publicado_em=publicado["publicado_em"],
            resumo=dto.resumo,
        )
