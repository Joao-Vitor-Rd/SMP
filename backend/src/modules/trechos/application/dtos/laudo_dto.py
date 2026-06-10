from pydantic import BaseModel, Field, ConfigDict
from typing import List
from datetime import datetime
from src.shared.enums.cargo_enum import CargoEnum

class UsuarioLaudoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    nome: str
    id: int
    cargo: CargoEnum

class LaudoCreateDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    responsavel: str = Field(..., min_length=1, max_length=150)
    credencial_responsavel: str
    data: datetime
    colaboradores_ids: List[int] = Field(default_factory=list)
    resumo: dict[str, int] = Field(default_factory=dict)

class LaudoUpdateDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    responsavel: str = Field(..., min_length=1, max_length=150)
    credencial_responsavel: str
    data: datetime
    colaboradores_ids: List[int] = Field(default_factory=list)
    resumo: dict[str, int] = Field(default_factory=dict)

class LaudoResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    id: int
    data: datetime
    responsavel: str
    credencial_responsavel: str
    usuarios: List[UsuarioLaudoDTO] = Field(default_factory=dict)
    resumo: dict[str, int] = Field(default_factory=dict)
    credencial_responsavel: str
