from datetime import datetime, timezone

from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo
from src.modules.trechos.application.dtos.laudo_dto import LaudoUpdateDTO


class AtualizarLaudoUseCase:

    def __init__(self, laudo_repository: ILaudoRepository):
        self.laudo_repository = laudo_repository

    def execute(
        self,
        laudo_id: int,
        dto: LaudoUpdateDTO,
    ) -> Laudo:

        data_utc = (
            dto.data
            if dto.data.tzinfo is not None
            else dto.data.replace(tzinfo=timezone.utc)
        )

        now_utc = datetime.now(timezone.utc)

        if data_utc > now_utc:
            raise ValueError("A data do laudo não pode ser no futuro")

        laudo = self.laudo_repository.update(
            laudo_id=laudo_id,
            responsavel=dto.responsavel,
            credencial_responsavel=dto.credencial_responsavel,
            data=dto.data,
            colaboradores_ids=dto.colaboradores_ids,
            resumo=dto.resumo,
        )

        if not laudo:
            raise ValueError("Laudo não encontrado")

        return laudo