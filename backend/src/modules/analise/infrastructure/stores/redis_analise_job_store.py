import json
from typing import Optional

from src.modules.analise.domain.entities.analise_job import AnalysisJobState, AnalysisJobStatus
from src.modules.analise.domain.repositories.i_analise_job_store import IAnaliseJobStore
from src.shared.infrastructure.redis_config import RedisClient


class RedisAnaliseJobStore(IAnaliseJobStore):
    """Persistência de jobs de análise em Redis (TTL 1h)."""

    PREFIX = "analise:job:"
    TTL_SECONDS = 3600

    def _key(self, job_id: str) -> str:
        return f"{self.PREFIX}{job_id}"

    async def _read_raw(self, job_id: str) -> Optional[dict]:
        client = await RedisClient.get_client()
        raw = await client.get(self._key(job_id))
        if not raw:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return None

    async def _write(self, job_id: str, payload: dict) -> None:
        client = await RedisClient.get_client()
        await client.set(self._key(job_id), json.dumps(payload), ex=self.TTL_SECONDS)

    async def set_pending(self, job_id: str, inspecao_id: int) -> None:
        await self._write(
            job_id,
            {
                "status": AnalysisJobStatus.PENDING.value,
                "inspecao_id": inspecao_id,
                "result": None,
                "error": None,
            },
        )

    async def set_completed(self, job_id: str, result: dict) -> None:
        existing = await self._read_raw(job_id) or {}
        await self._write(
            job_id,
            {
                "status": AnalysisJobStatus.COMPLETED.value,
                "inspecao_id": existing.get("inspecao_id"),
                "result": result,
                "error": None,
            },
        )

    async def set_failed(self, job_id: str, error: str) -> None:
        existing = await self._read_raw(job_id) or {}
        await self._write(
            job_id,
            {
                "status": AnalysisJobStatus.FAILED.value,
                "inspecao_id": existing.get("inspecao_id"),
                "result": None,
                "error": error,
            },
        )

    async def get(self, job_id: str) -> Optional[AnalysisJobState]:
        data = await self._read_raw(job_id)
        if data is None:
            return None
        return AnalysisJobState(
            status=data.get("status", AnalysisJobStatus.PENDING.value),
            inspecao_id=data.get("inspecao_id"),
            result=data.get("result"),
            error=data.get("error"),
        )
