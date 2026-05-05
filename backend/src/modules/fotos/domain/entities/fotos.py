from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Column, DateTime, Float, Integer, String

from src.shared.infrastructure.db import Base


class fotosORM(Base):
    __tablename__ = "fotos"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nome_original_arquivo = Column(String, nullable=False)
    nome_aquivo = Column(String, unique=True, nullable=False)
    caminho_arquivo = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    tipo_arquivo = Column(String, nullable=False)
    criado_em = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class Foto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    nome_original_arquivo: str
    nome_aquivo: str
    caminho_arquivo: str
    latitude: float | None = None
    longitude: float | None = None
    tipo_arquivo: str
    criado_em: datetime | None = None


Colaborador = Foto