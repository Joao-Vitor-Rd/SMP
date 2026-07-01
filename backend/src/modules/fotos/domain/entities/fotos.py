from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.shared.infrastructure.db import Base

if TYPE_CHECKING:
    from src.modules.trechos.domain.entities.trecho import TrechoORM

# Importação em runtime para registrar TrechoORM no metadata antes de configurar
# o mapper de fotosORM (necessário no worker, que não carrega o módulo trechos).
from src.modules.trechos.domain.entities.trecho import TrechoORM as _TrechoORM  # noqa: F401


class fotosORM(Base):
    __tablename__ = "fotos"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nome_original_arquivo = Column(String, nullable=False)
    nome_aquivo = Column(String, unique=True, nullable=False)
    caminho_arquivo = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    trecho_id = Column(String(36), ForeignKey("trechos.id_trecho", ondelete="SET NULL"), nullable=True, index=True)
    laudo_id = Column(Integer, ForeignKey("laudo.id", ondelete="SET NULL"), nullable=True, index=True)
    tipo_arquivo = Column(String, nullable=False)
    criado_em = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    trecho = relationship("TrechoORM", back_populates="fotos", lazy="joined")


class Foto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    nome_original_arquivo: str
    nome_aquivo: str
    caminho_arquivo: str
    latitude: float | None = None
    longitude: float | None = None
    trecho_id: str | None = None
    laudo_id: int | None = None
    tipo_arquivo: str
    criado_em: datetime | None = None


Colaborador = Foto