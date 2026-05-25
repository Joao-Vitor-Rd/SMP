from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TrechoFotoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    caminho_arquivo: str
    latitude: float | None = None
    longitude: float | None = None


class TrechoListItemDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id_trecho: str
    criado_em: datetime | None = None
    foto_ids: list[int]
    fotos: list[TrechoFotoDTO]


class TrechoListResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[TrechoListItemDTO]
