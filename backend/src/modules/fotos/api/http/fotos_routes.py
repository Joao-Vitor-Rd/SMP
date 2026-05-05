import os
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from src.modules.fotos.application.dtos.foto_dto import (
    FotoDeleteResponseDTO,
    FotoUploadResponseDTO,
    ImagemUploadInputDTO,
    ProcessamentoFotosResponseDTO,
)
from src.modules.fotos.application.use_case.uc_09 import Uc09UploadMultiplasImagensUseCase
from src.modules.fotos.infrastructure.repositories.foto_repository import FotoRepository
from src.modules.fotos.infrastructure.services.minio_adapter import MinioAdapter
from src.modules.fotos.infrastructure.services.minio_client import ensure_bucket_exists, get_minio_client
from src.shared.auth.dependencies import verify_any_user, verify_supervisor_role
from src.shared.infrastructure.db import get_session

router = APIRouter(tags=["Fotos"])


def get_foto_storage() -> MinioAdapter:
    bucket_name = os.getenv("MINIO_BUCKET", "smp-fotos")
    ensure_bucket_exists(bucket_name)
    return MinioAdapter(get_minio_client(), bucket_name)


def get_foto_repository(session=Depends(get_session)) -> FotoRepository:
    return FotoRepository(session)


def get_uc09(
    foto_repository: FotoRepository = Depends(get_foto_repository),
    foto_storage: MinioAdapter = Depends(get_foto_storage),
) -> Uc09UploadMultiplasImagensUseCase:
    return Uc09UploadMultiplasImagensUseCase(foto_repository=foto_repository, foto_storage=foto_storage)


@router.post(
    "/upload-multiplas",
    response_model=ProcessamentoFotosResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Upload múltiplo de imagens",
    description="Recebe várias imagens, extrai geolocalização, envia para o MinIO e persiste no banco",
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "format": "binary",
                                },
                            }
                        },
                        "required": ["files"],
                    }
                }
            }
        }
    },
)
async def upload_multiplas_imagens(
    files: List[UploadFile] = File(..., description="Arquivos de imagem no campo files"),
    _: dict = Depends(verify_any_user),
    use_case: Uc09UploadMultiplasImagensUseCase = Depends(get_uc09),
):
    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo foi enviado")

    arquivos = [
        ImagemUploadInputDTO(
            filename=file.filename or f"imagem-{index + 1}",
            content_type=file.content_type,
            content=await file.read(),
        )
        for index, file in enumerate(files)
    ]

    resultado = await use_case.execute(arquivos)

    if resultado.success and resultado.failed:
        status_code = status.HTTP_207_MULTI_STATUS
    elif resultado.success:
        status_code = status.HTTP_201_CREATED
    else:
        status_code = status.HTTP_400_BAD_REQUEST

    return JSONResponse(status_code=status_code, content=resultado.model_dump(mode="json"))


@router.post(
    "/",
    response_model=FotoUploadResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Salvar foto",
    description="Envia uma imagem para o MinIO e retorna o caminho armazenado",
)
async def salvar_foto(
    file: UploadFile = File(...),
    _: dict = Depends(verify_supervisor_role),
    foto_storage: MinioAdapter = Depends(get_foto_storage),
):
    try:
        conteudo = await file.read()
        if not conteudo:
            raise HTTPException(status_code=400, detail="Arquivo vazio")

        extensao = os.path.splitext(file.filename or "")[1].lower()
        nome_arquivo = f"{uuid4().hex}{extensao}"

        caminho_arquivo = foto_storage.save(
            conteudo_arquivo=conteudo,
            nome_arquivo=nome_arquivo,
            content_type=file.content_type,
        )

        return FotoUploadResponseDTO(
            nome_original_arquivo=file.filename or nome_arquivo,
            nome_arquivo=nome_arquivo,
            caminho_arquivo=caminho_arquivo,
            tipo_arquivo=file.content_type or "application/octet-stream",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar foto: {str(e)}")


@router.delete(
    "/{caminho_arquivo:path}",
    response_model=FotoDeleteResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Deletar foto",
    description="Remove uma imagem do MinIO pelo caminho ou nome do objeto",
)
async def deletar_foto(
    caminho_arquivo: str,
    _: dict = Depends(verify_supervisor_role),
    foto_storage: MinioAdapter = Depends(get_foto_storage),
):
    try:
        removido = foto_storage.delete(caminho_arquivo)
        if not removido:
            raise HTTPException(status_code=404, detail="Foto não encontrada")

        return FotoDeleteResponseDTO(caminho_arquivo=caminho_arquivo, removido=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar foto: {str(e)}")
