from sqlalchemy import Column, String, CheckConstraint, Enum
from sqlalchemy.orm import validates
from sqlalchemy import Column, Integer
from src.shared.infrastructure.db import Base
from src.shared.enums.uf_enum import UFEnum
from pydantic import BaseModel, field_validator
from typing import Optional

class SupervisorORM(Base):
    __tablename__ = "supervisor"
    
    id = Column(Integer, primary_key=True, autoincrement=True)

    name = Column(String(150), nullable=False)

    idendificador_profissional = Column(String(20), unique=True, nullable=False)

    uf = Column(Enum(UFEnum), nullable=False)

    cidade = Column(String(50), nullable=False)
    
    email = Column(String(150), unique=True, nullable=False)
    
    password = Column(String(255), nullable=False)

    #validação de senha no banco
    __table_args__ = (
        CheckConstraint("length(password) >= 8", name="check_password_min_length"),
    )

    @validates("password")
    def validate_password(self, key, value):
        if len(value) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return value
    
class Supervisor(BaseModel):
    model_config = {"from_attributes": True}
    
    id: Optional[int] = None
    name: str
    idendificador_profissional: str
    uf: str
    cidade: str
    email: str
    password: str

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v):
        if not UFEnum.is_valid(v):
            raise ValueError(f"UF inválida")
        return v