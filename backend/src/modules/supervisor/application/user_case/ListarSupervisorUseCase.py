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
                nome=supervisor.name,
                email=supervisor.email,
                identificador_profissional=supervisor.idendificador_profissional,
                uf=supervisor.uf,
                cidade=supervisor.cidade,
                telefone=supervisor.telefone,
                empresa=supervisor.empresa_ou_orgao
            )
            for supervisor in supervisores
        ]
