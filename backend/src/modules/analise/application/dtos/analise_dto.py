from typing import List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.modules.analise.domain.entities.deteccao import DefeitoDNIT


class DeteccaoDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, use_enum_values=True)

    id: Optional[Union[int, str]] = None
    defeito: DefeitoDNIT
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    severidade: Optional[str] = None
    observacao: Optional[str] = None
    imagem_id: Optional[int] = None
    revisado_manualmente: bool = False

    @field_validator("confidence_score", mode="before")
    @classmethod
    def _normalize_confidence(cls, value):
        try:
            score = float(value)
        except (TypeError, ValueError):
            return 0.0
        if score < 0:
            return 0.0
        # Trata percentuais (ex.: 85 -> 0.85) defensivamente; contrato é 0..1.
        if score > 1:
            score = score / 100
        return min(score, 1.0)


class LaudoAnaliseDTO(BaseModel):
    """Laudo de análise trocado com o frontend (trigger result / PUT laudo)."""

    model_config = ConfigDict(populate_by_name=True)

    inspecao_id: Optional[Union[int, str]] = None
    deteccoes: List[DeteccaoDTO] = Field(default_factory=list)
    observacoes_gerais: Optional[str] = None


class TriggerAnalysisResponseDTO(BaseModel):
    job_id: str


class AnalysisStatusResponseDTO(BaseModel):
    status: str
    result: Optional[LaudoAnaliseDTO] = None
