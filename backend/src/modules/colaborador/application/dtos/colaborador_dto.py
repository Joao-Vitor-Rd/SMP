from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CreateColaboradorDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    nome: str
    id_profissional_responsavel: int
    is_tecnico: bool
    email: EmailStr
    cft: Optional[str] = None
    limite_acesso: Optional[datetime] = None


class UpdateColaboradorDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: Optional[str] = None
    uf: Optional[str] = None
    cidade: Optional[str] = None
    empresa_ou_orgao: Optional[str] = None
    telefone: Optional[str] = None
    instituicao_ensino: Optional[str] = None
    is_tecnico: Optional[bool] = None
    id_profissional_responsavel: Optional[int] = None


class ColaboradorResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    nome: str
    id_profissional_responsavel: int
    is_tecnico: bool
    email: EmailStr
    cft: Optional[str] = None
    uf: Optional[str] = None
    cidade: Optional[str] = None
    empresa_ou_orgao: Optional[str] = None
    telefone: Optional[str] = None
    instituicao_ensino: Optional[str] = None
    limite_acesso: Optional[datetime] = None
    acesso_liberado: bool = False
    status: str = "Ativo"


class ListarColaboradoresDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: int
    nome: str
    email: EmailStr
    limite_acesso: Optional[datetime] = None
    ativo: bool


class AtualizarLimiteAcessoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    limite_acesso: datetime