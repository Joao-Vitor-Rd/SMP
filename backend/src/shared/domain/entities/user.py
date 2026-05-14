from sqlalchemy import Column, Integer, String, Enum
from src.shared.infrastructure.db import Base
from src.shared.enums.cargo_enum import CargoEnum
from pydantic import BaseModel
from typing import Optional


class UserORM(Base):
    """Tabela de usuário centralizada com dados comuns"""
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    cargo = Column(
        Enum(CargoEnum, values_callable=lambda x: [e.value for e in x], name="cargoenum"),
        nullable=False
    )


class User(BaseModel):
    """DTO para usuário"""
    model_config = {"from_attributes": True}
    
    id: Optional[int] = None
    nome: str
    email: str
    cargo: CargoEnum
