from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TrechoFotoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    caminho_arquivo: str
    latitude: float | None = None
    longitude: float | None = None


class TrechoListItemDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id_trecho: str
    criado_em: datetime | None = None
    foto_ids: list[int]
    fotos: list[TrechoFotoDTO]
    cidade: str | None = None
    uf: str | None = None
    responsavel_tecnico: str | None = None
    classificacao_qualidade: str | None = None
    pci: float | None = None
    defeitos: dict[str, int] | None = None
    responsavel_id: int | None = None


class TrechoListResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[TrechoListItemDTO]


class PaginatedTrechoListResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[TrechoListItemDTO]
    total: int
    totalPages: int = Field(..., alias="totalPages")
    currentPage: int = Field(..., alias="currentPage")
    hasNextPage: bool = Field(..., alias="hasNextPage")
    hasPreviousPage: bool = Field(..., alias="hasPreviousPage")


class TrechoCreateDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    foto_ids: list[int] = Field(default_factory=list, alias="fotoIds")
    responsavel_tecnico: str | None = Field(default=None, alias="responsavelTecnico")
    defeitos: dict[str, int] | None = Field(default=None)
    classificacao_qualidade: str | None = Field(default=None, alias="classificacaoQualidade")


class TrechoUpdateDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cidade: str | None = None
    uf: str | None = None
    responsavel_tecnico: str | None = Field(default=None, alias="responsavelTecnico")
    classificacao_qualidade: str | None = Field(default=None, alias="classificacaoQualidade")
    defeitos: dict[str, int] | None = Field(default=None)

