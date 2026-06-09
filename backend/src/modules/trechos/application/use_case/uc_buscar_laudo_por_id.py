from typing import Optional
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo

class BuscarLaudoPorIdUseCase:
    def __init__(self, laudo_repository: ILaudoRepository):
        self.laudo_repository = laudo_repository

    def execute(self, laudo_id: int) -> Optional[Laudo]:
        return self.laudo_repository.find_by_id(laudo_id)
