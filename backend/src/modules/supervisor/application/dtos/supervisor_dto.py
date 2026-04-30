from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


class CreateSupervisorDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    nome: str
    identificador_profissional: str
    uf: str
    cidade: str
    email: EmailStr
    senha: str


class UpdateSupervisorDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    uf: str
    cidade: str
    empresa_ou_orgao: Optional[str] = None
    telefone: Optional[str] = None


class SupervisorResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    nome: str
    identificador_profissional: str
    uf: str
    cidade: str
    email: str
    telefone: Optional[str] = None
    empresa: Optional[str] = None
