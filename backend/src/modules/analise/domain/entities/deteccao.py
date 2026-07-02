from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from src.shared.enums.defeito_dnit_enum import DefeitoDNIT, parse_defeito_dnit
from src.shared.infrastructure.db import Base

__all__ = ["DefeitoDNIT", "DeteccaoORM", "Deteccao"]


class DeteccaoORM(Base):
    __tablename__ = "deteccao"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # inspecao_id referencia o laudo (no modelo atual inspeção == laudo)
    inspecao_id = Column(
        Integer,
        ForeignKey("laudo.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    defeito = Column(String(50), nullable=False)
    confidence_score = Column(Float, nullable=False, default=0.0)
    severidade = Column(String(50), nullable=True)
    observacao = Column(Text, nullable=True)
    # Referência lógica à foto analisada. Sem FK para `fotos.id` para não
    # acoplar a criação da tabela à existência de `fotos` no schema.
    imagem_id = Column(Integer, nullable=True)
    revisado_manualmente = Column(Boolean, nullable=False, default=False)
    criado_em = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class Deteccao(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: Optional[int] = None
    inspecao_id: Optional[int] = None
    defeito: DefeitoDNIT
    confidence_score: float
    severidade: Optional[str] = None
    observacao: Optional[str] = None
    imagem_id: Optional[int] = None
    revisado_manualmente: bool = False

    @field_validator("defeito", mode="before")
    @classmethod
    def _normalize_defeito(cls, value):
        return parse_defeito_dnit(value)
