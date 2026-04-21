from sqlalchemy import Column, String, Enum
from src.shared.enums.uf_enum import UFEnum
from sqlalchemy import Column, Integer, Boolean
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from src.shared.infrastructure.db import Base
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

class ColaboradorORM(Base):
    __tablename__ = "colaborador"
    
    id = Column(Integer, primary_key=True, autoincrement=True)

    nome = Column(String(150), nullable=False)

    id_profissional_responsavel = Column(
        Integer,
        ForeignKey("supervisor.id"),
        nullable=False
    )

    uf = Column(Enum(UFEnum), nullable=True)

    cidade = Column(String(50), nullable=True)
    
    email = Column(String(150), unique=True, nullable=False)

    instituicao_ensino = Column(String(255), nullable=True)

    empresa_ou_orgao = Column(String(255), nullable=True)

    telefone = Column(String(20), nullable=True)

    is_tecnico = Column(Boolean, default=False, nullable=False)

    senha = Column(String(255), nullable=True)

    limite_acesso = Column(DateTime(timezone=True), nullable=True)

    acesso_liberado = Column(Boolean, default=False, nullable=False)

    tentativas_falhas = Column(Integer, default=0, nullable=False)

    limite_de_bloqueio = Column(DateTime(timezone=True), nullable=True)
    

class Colaborador(BaseModel):
    model_config = {"from_attributes": True}
    
    id: Optional[int] = None
    nome: str
    email: str
    is_tecnico: bool
    id_profissional_responsavel: int
    uf: Optional[str] = None
    cidade: Optional[str] = None
    instituicao_ensino: Optional[str] = None
    empresa_ou_orgao: Optional[str] = None
    telefone: Optional[str] = None
    senha: Optional[str] = None
    limite_acesso: Optional[datetime] = None
    acesso_liberado: bool = False
    tentativas_falhas: int = 0
    limite_de_bloqueio: Optional[datetime] = None
    
    def is_locked(self) -> bool:
        if self.limite_de_bloqueio is None:
            return False
        return datetime.now(timezone.utc) < self.limite_de_bloqueio
    
    def is_acesso_liberado(self) -> bool:
        return self.acesso_liberado