from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CreateColaboradorDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    nome: str
    id_profissional_responsavel: str
    uf: str
    cidade: str
    email: EmailStr
    limite_acesso: datetime
    acesso_liberado: bool = False


class ColaboradorResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    nome: str
    id_profissional_responsavel: str
    uf: str
    cidade: str
    email: str
    limite_acesso: datetime
    acesso_liberado: bool = False