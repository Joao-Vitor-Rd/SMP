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
