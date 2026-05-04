from sqlalchemy import Column, String, Enum
from src.shared.enums.uf_enum import UFEnum
from sqlalchemy import Column, Integer, Boolean
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from src.shared.infrastructure.db import Base
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

class fotosORM(Base):
    __tablename__ = "fotos"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    nome_original_arquivo = Column(String, nullable=False)

    nome_aquivo = Column(String, unique=True, nullable=False)

    caminho_arquivo = Column(String, nullable=False)

    tipo_arquivo = Column(String, nullable=False)

    criado_em = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )

class Colaborador(BaseModel):
    model_config = {"from_attributes": True}
    
    
    id: int
    nome_original_arquivo: str
    nome_aquivo: str
    caminho_arquivo: str
    tipo_arquivo: str
    criado_em: datetime