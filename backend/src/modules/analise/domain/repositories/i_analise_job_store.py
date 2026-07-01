from abc import ABC, abstractmethod
from typing import Optional

from src.modules.analise.domain.entities.analise_job import AnalysisJobState


class IAnaliseJobStore(ABC):

    @abstractmethod
    async def set_pending(self, job_id: str, inspecao_id: int) -> None:
        ...

    @abstractmethod
    async def set_completed(self, job_id: str, result: dict) -> None:
        ...

    @abstractmethod
    async def set_failed(self, job_id: str, error: str) -> None:
        ...

    @abstractmethod
    async def get(self, job_id: str) -> Optional[AnalysisJobState]:
        ...
