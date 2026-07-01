from typing import Optional

from src.modules.analise.application.dtos.analise_dto import (
    AnalysisStatusResponseDTO,
    LaudoAnaliseDTO,
)
from src.modules.analise.domain.repositories.i_analise_job_store import IAnaliseJobStore


class ConsultarStatusAnaliseUseCase:
    def __init__(self, job_store: IAnaliseJobStore):
        self.job_store = job_store

    async def execute(self, job_id: str) -> Optional[AnalysisStatusResponseDTO]:
        state = await self.job_store.get(job_id)
        if state is None:
            return None

        result = LaudoAnaliseDTO(**state.result) if state.result else None
        status_value = state.status.value if hasattr(state.status, "value") else str(state.status)
        return AnalysisStatusResponseDTO(status=status_value, result=result)
