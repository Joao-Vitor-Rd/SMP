from abc import ABC, abstractmethod
from typing import List, Optional
from src.modules.colaborador.domain.entities.colaborador import Colaborador 
from datetime import datetime

class IColaboradorRepository(ABC):

    @abstractmethod
    def save(self, colaborador: Colaborador) -> Colaborador:
        pass

    @abstractmethod
    def find_all(self) -> List[Colaborador]:
        pass

    @abstractmethod
    def update_limite_acesso(self, colaborador_id: int, limite_acesso: datetime):
        pass

    @abstractmethod
    def update_acesso(self, colaborador_id: int):
        pass

    @abstractmethod
    def update_tentativas(self, supervisor_id: int, tentativas: int):
        pass

    @abstractmethod
    def update_tempo_bloqueio(self, supervisor_id: int, tempo_bloqueio: datetime):
        pass

    @abstractmethod
    def find_by_email(self, email: str) -> Optional[Colaborador]:
        pass

    @abstractmethod
    def delete(self, colaborador_id: int) -> None:
        pass

