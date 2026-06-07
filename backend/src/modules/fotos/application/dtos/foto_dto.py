from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FotoUploadResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome_original_arquivo: str
    nome_arquivo: str
    caminho_arquivo: str
    tipo_arquivo: str


class FotoDeleteResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    caminho_arquivo: str
    removido: bool = True


class ImagemUploadInputDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    filename: str
    content_type: str | None = None
    content: bytes


class FotoUploadSucessoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    filename: str
    latitude: float
    longitude: float
    caminho_arquivo: str
    trecho_id: str | None = None


class FotoUploadFalhaDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    filename: str
    reason: str
    image_url: str | None = None
    id: int | None = None


class TrechoCriadoDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id_trecho: str
    foto_ids: list[int]


class ProcessamentoFotosResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: list[FotoUploadSucessoDTO]
    failed: list[FotoUploadFalhaDTO]
    trecho: TrechoCriadoDTO | None = None


class AtualizarLocalizacaoFotoInputDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class FotoLocalizacaoResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    latitude: float
    longitude: float
    trecho_id: str | None = None


class MapReviewInspectionDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    foto_id: int | None = None
    file_name: str
    image_url: str
    latitude: float | None = None
    longitude: float | None = None
    location_source: str
    location_exception: str | None = None
    status: str
    note: str
    updated_at: datetime


class ConfirmarRevisaoMapaItemDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str | int | None = None
    foto_id: int | None = Field(default=None, alias="fotoId")
    file_name: str | None = Field(default=None, alias="fileName")
    image_url: str | None = Field(default=None, alias="imageUrl")
    latitude: float | None = None
    longitude: float | None = None
    location_source: str | None = Field(default=None, alias="locationSource")
    location_exception: str | None = Field(default=None, alias="locationException")
    status: str | None = None
    note: str | None = None
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class ConfirmarRevisaoMapaDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[ConfirmarRevisaoMapaItemDTO]
    confirmed_at: datetime | None = Field(default=None, alias="confirmedAt")
