from abc import ABC, abstractmethod
from typing import List, Optional
from src.modules.supervisor.domain.entities.supervisor import Supervisor
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
    def find_all(self) -> List[Supervisor]:
        pass

    @abstractmethod
    def update_tentativas(self, supervisor_id: int, tentativas: int):
        pass

    @abstractmethod
    def update_tempo_bloqueio(self, supervisor_id: int, tempo_bloqueio: datetime):
        pass
