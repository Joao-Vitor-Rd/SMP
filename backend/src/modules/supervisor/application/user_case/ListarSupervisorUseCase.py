from typing import List
from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository

class ListarSupervisorUseCase:

    def __init__(self, repository: ISupervisorRepository):
        self.repository = repository

    def execute(self) -> List[Supervisor]:
        return self.repository.find_all()
