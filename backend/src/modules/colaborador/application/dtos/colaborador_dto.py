from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CreateColaboradorDTO(BaseModel):
    nome: str
    id_profissional_responsavel: str
    uf: str
    cidade: str
    email: EmailStr
    limite_acesso: datetime
    acesso_liberado: bool = False


class ColaboradorResponseDTO(BaseModel):
    id: int
    name: str
    id_profissional_responsavel: str
    uf: str
    cidade: str
    email: str
    limite_acesso: datetime
    acesso_liberado: bool = False