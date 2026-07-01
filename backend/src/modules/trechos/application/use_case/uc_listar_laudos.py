from typing import Optional
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo
from typing import Optional

class ListarLaudosUseCase:
    def __init__(self, laudo_repository: ILaudoRepository):
        self.laudo_repository = laudo_repository

    def execute(self, user_id: Optional[int] = None, cargo: Optional[str] = None) -> list[Laudo]:
        if cargo == "supervisor" or not user_id:
            return self.laudo_repository.list_all()
            
        return self.laudo_repository.list_by_user_permissions(user_id=user_id)
