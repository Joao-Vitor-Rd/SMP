from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import relationship

from src.shared.infrastructure.db import Base


class TrechoORM(Base):
    __tablename__ = "trechos"

    id_trecho = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    criado_em = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    fotos = relationship("fotosORM", back_populates="trecho", lazy="selectin")

    @property
    def foto_ids(self) -> list[int]:
        return [foto.id for foto in self.fotos if foto.id is not None]


class Trecho(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_trecho: str
    foto_ids: list[int] = Field(default_factory=list)
    criado_em: datetime | None = None
