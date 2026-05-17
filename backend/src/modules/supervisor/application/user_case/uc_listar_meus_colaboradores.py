from src.modules.supervisor.application.dtos import SupervisorResponseDTO, UpdateSupervisorDTO
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.colaborador.application.dtos.colaborador_dto import ListarColaboradoresDTO
from typing import List


class ListarMeusColaboradores:

    def __init__(
        self,
        repository: ISupervisorRepository,
    ):
        self.repository = repository

    def execute(self, supervisor_id: int) -> List[ListarColaboradoresDTO]:
        supervisor_atual = self.repository.find_by_id(supervisor_id)

        if supervisor_atual is None:
            raise ValueError("Supervisor não encontrado")

        meus_colaboradores = self.repository.listar_meus_colaboradores(supervisor_id)

        return meus_colaboradores