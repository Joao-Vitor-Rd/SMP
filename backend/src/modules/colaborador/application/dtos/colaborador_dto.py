from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CreateColaboradorDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    nome: str
    id_profissional_responsavel: int
    is_tecnico: bool
    email: EmailStr
    limite_acesso: Optional[datetime] = None


class ColaboradorResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    nome: str
    id_profissional_responsavel: int
    is_tecnico: bool
    email: EmailStr
    limite_acesso: Optional[datetime] = None
    acesso_liberado: bool = False
    status: str = "Ativo"