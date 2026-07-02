from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union
from datetime import datetime
from src.modules.analise.application.dtos.analise_dto import DeteccaoDTO
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
    publicado_em: Optional[datetime] = None
    publicacao_resumo: Optional["ResumoPublicacaoDTO"] = None
    deteccoes: List[DeteccaoDTO] = Field(default_factory=list)


class ResumoPublicacaoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    via: str
    km: str
    pci: float
    igg: float
    observacoes: Optional[str] = None


class LaudoPublicacaoCreateDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    inspecao_id: Optional[Union[int, str]] = None
    resumo: ResumoPublicacaoDTO


class LaudoPublicadoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: int
    inspecao_id: int
    publicado_em: datetime
    resumo: ResumoPublicacaoDTO
    deteccoes: List[DeteccaoDTO] = Field(default_factory=list)
