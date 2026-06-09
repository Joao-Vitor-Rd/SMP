from datetime import datetime, timezone
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo

class CriarLaudoUseCase:
    def __init__(self, laudo_repository: ILaudoRepository):
        self.laudo_repository = laudo_repository

    def execute(self, responsavel: str, data: datetime, colaboradores_ids: list[int]) -> Laudo:
        data_utc = data if data.tzinfo is not None else data.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        if data_utc > now_utc:
            raise ValueError("A data do laudo não pode ser no futuro")

        return self.laudo_repository.create(
            responsavel=responsavel,
            data=data,
            colaboradores_ids=colaboradores_ids
        )
