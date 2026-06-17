from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, DateTime, String, Integer, ForeignKey, JSON
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
    cidade = Column(String(100), nullable=True)
    uf = Column(String(2), nullable=True)
    responsavel_tecnico = Column(String(150), nullable=True)
    classificacao_qualidade = Column(String(50), nullable=True)
    defeitos = Column(JSON, nullable=True)
    responsavel_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)

    fotos = relationship("fotosORM", back_populates="trecho", lazy="selectin")
    responsavel = relationship("UserORM", lazy="joined")

    @property
    def foto_ids(self) -> list[int]:
        return [foto.id for foto in self.fotos if foto.id is not None]


class TrechoFotoInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    caminho_arquivo: str
    latitude: float | None = None
    longitude: float | None = None


class Trecho(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_trecho: str
    foto_ids: list[int] = Field(default_factory=list)
    fotos: list[TrechoFotoInfo] = Field(default_factory=list)
    criado_em: datetime | None = None
    cidade: str | None = None
    uf: str | None = None
    responsavel_tecnico: str | None = None
    classificacao_qualidade: str | None = None
    defeitos: dict[str, int] | None = None
    responsavel_id: int | None = None

