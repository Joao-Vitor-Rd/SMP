from sqlalchemy import Column, String, CheckConstraint, Enum
from sqlalchemy.orm import validates
from sqlalchemy import Column, Integer
from src.shared.infrastructure.db import Base
from src.shared.enums.uf_enum import UFEnum
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from sqlalchemy import DateTime
from datetime import datetime, timezone

class SupervisorORM(Base):
    __tablename__ = "supervisor"
    
    id = Column(Integer, primary_key=True, autoincrement=True)

    name = Column(String(150), nullable=False)

    idendificador_profissional = Column(String(20), unique=True, nullable=False)

    uf = Column(Enum(UFEnum), nullable=False)

    cidade = Column(String(50), nullable=False)
    
    email = Column(String(150), unique=True, nullable=False)
    
    password = Column(String(255), nullable=False)

    tentativas_falhas = Column(Integer, default=0, nullable=False)

    limite_de_bloqueio = Column(DateTime(timezone=True), nullable=True)
    
class Supervisor(BaseModel):
    model_config = {"from_attributes": True}
    
    id: Optional[int] = None
    name: str
    idendificador_profissional: str
    uf: str
    cidade: str
    email: str
    password: str
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