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


class SupervisorResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    nome: str
    identificador_profissional: str
    uf: str
    cidade: str
    email: str
