from src.modules.fotos.application.dtos.foto_dto import (
    AtualizarLocalizacaoFotoInputDTO,
    FotoLocalizacaoResponseDTO,
)
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository


class Uc10AtualizarLocalizacaoFotoUseCase:
    def __init__(self, foto_repository: IFotoRepository):
        self.foto_repository = foto_repository

    def execute(self, foto_id: int, input_dto: AtualizarLocalizacaoFotoInputDTO) -> FotoLocalizacaoResponseDTO:
        foto_atual = self.foto_repository.find_by_id(foto_id)
        if foto_atual is None:
            raise ValueError("Foto nao encontrada")

        foto_atualizada = self.foto_repository.update_localizacao(
            foto_id=foto_id,
            latitude=input_dto.latitude,
            longitude=input_dto.longitude,
        )
        if foto_atualizada is None:
            raise ValueError("Foto nao encontrada")

        return FotoLocalizacaoResponseDTO(
            id=foto_atualizada.id if foto_atualizada.id is not None else foto_id,
            latitude=foto_atualizada.latitude if foto_atualizada.latitude is not None else input_dto.latitude,
            longitude=foto_atualizada.longitude if foto_atualizada.longitude is not None else input_dto.longitude,
            trecho_id=foto_atualizada.trecho_id,
        )
