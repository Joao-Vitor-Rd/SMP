from pydantic import BaseModel, ConfigDict


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
    latitude: float
    longitude: float
    caminho_arquivo: str


class FotoUploadFalhaDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    filename: str
    reason: str
    image_url: str | None = None


class ProcessamentoFotosResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: list[FotoUploadSucessoDTO]
    failed: list[FotoUploadFalhaDTO]
