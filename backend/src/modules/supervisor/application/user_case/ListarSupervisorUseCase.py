from typing import List
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.application.dtos import SupervisorResponseDTO

class ListarSupervisorUseCase:

    def __init__(self, repository: ISupervisorRepository):
        self.repository = repository

    def execute(self) -> List[SupervisorResponseDTO]:
        supervisores = self.repository.find_all()
        return [
            SupervisorResponseDTO(
                id=supervisor.id,
                name=supervisor.name,
                email=supervisor.email,
                idendificador_profissional=supervisor.idendificador_profissional,
                uf=supervisor.uf,
                cidade=supervisor.cidade
            )
            for supervisor in supervisores
        ]
