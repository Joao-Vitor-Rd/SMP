from enum import Enum
from typing import Optional

from pydantic import BaseModel


class AnalysisJobStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisJobState(BaseModel):
    """Estado de um job de análise mantido no store (Redis).

    `result` carrega o laudo serializado (dict) quando `status == completed`.
    """

    status: AnalysisJobStatus
    inspecao_id: Optional[int] = None
    result: Optional[dict] = None
    error: Optional[str] = None
