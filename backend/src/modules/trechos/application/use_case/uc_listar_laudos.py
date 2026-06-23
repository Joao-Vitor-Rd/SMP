from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo
from typing import Optional

class ListarLaudosUseCase:
    def __init__(self, laudo_repository: ILaudoRepository):
        self.laudo_repository = laudo_repository

    def execute(self, usuario_id: Optional[int] = None) -> list[Laudo]:
        if usuario_id is not None:
            return self.laudo_repository.list_by_usuario(usuario_id)
        return self.laudo_repository.list_all()