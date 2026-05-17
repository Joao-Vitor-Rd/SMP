from abc import ABC, abstractmethod
from typing import List, Optional
from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.colaborador.application.dtos.colaborador_dto import ListarColaboradoresDTO
from datetime import datetime, timezone

class ISupervisorRepository(ABC):

    @abstractmethod
    def save(self, supervisor: Supervisor) -> Supervisor:
        pass

    @abstractmethod
    def find_by_id(self, supervisor_id: int) -> Optional[Supervisor]:
        pass

    @abstractmethod
    def find_by_email(self, email: str) -> Optional[Supervisor]:
        pass

    @abstractmethod
    def find_by_identificador_profissional(self, supervisor_id: int) -> Optional[Supervisor]:
        pass
    
    @abstractmethod
    def find_all(self) -> List[Supervisor]:
        pass

    @abstractmethod
    def update_tentativas(self, supervisor_id: int, tentativas: int):
        pass

    @abstractmethod
    def update_tempo_bloqueio(self, supervisor_id: int, tempo_bloqueio: datetime):
        pass

    @abstractmethod
    def update_supervisor(self, novo_supervisor: Supervisor) -> Supervisor:
        pass

    @abstractmethod
    def listar_meus_colaboradores(self, supervisor_id) -> List[ListarColaboradoresDTO]:
        pass
