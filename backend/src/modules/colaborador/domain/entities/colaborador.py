from sqlalchemy import Column, String, Enum
from src.shared.enums.uf_enum import UFEnum
from sqlalchemy import Column, Integer, Boolean
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from src.shared.infrastructure.db import Base
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, timezone

class ColaboradorORM(Base):
    __tablename__ = "colaborador"
    
    id = Column(Integer, primary_key=True, autoincrement=True)

    nome = Column(String(150), nullable=False)

    id_profissional_responsavel = Column(
        String(20),
        ForeignKey("supervisor.idendificador_profissional"),
        nullable=False
    )

    uf = Column(Enum(UFEnum), nullable=False)

    cidade = Column(String(50), nullable=False)
    
    email = Column(String(150), unique=True, nullable=False)

    senha = Column(String(255), nullable=False)

    limite_acesso = Column(DateTime(timezone=True), nullable=False)

    acesso_liberado = Column(Boolean, default=False, nullable=False)

    tentativas_falhas = Column(Integer, default=0, nullable=False)

    limite_de_bloqueio = Column(DateTime(timezone=True), nullable=True)
    

class Colaborador(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    nome: str
    id_profissional_responsavel: str
    uf: str
    cidade: str
    email: str
    senha: str
    limite_acesso: datetime
    acesso_liberado: bool = False
    tentativas_falhas: int = 0
    limite_de_bloqueio: Optional[datetime] = None

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v):
        if not UFEnum.is_valid(v):
            raise ValueError(f"UF inválida")
        return v
    
    def is_locked(self) -> bool:
        if self.limite_de_bloqueio is None:
            return False
        return datetime.now(timezone.utc) < self.limite_de_bloqueio
    
    def is_acesso_liberado(self) -> bool:
        return self.acesso_liberado