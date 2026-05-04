import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from src.modules.fotos.application.dtos.foto_dto import FotoDeleteResponseDTO, FotoUploadResponseDTO
from src.modules.fotos.infrastructure.services.minio_adapter import MinioAdapter
from src.modules.fotos.infrastructure.services.minio_client import ensure_bucket_exists, get_minio_client
from src.shared.auth.dependencies import verify_supervisor_role

router = APIRouter(tags=["Fotos"])


def get_foto_storage() -> MinioAdapter:
    bucket_name = os.getenv("MINIO_BUCKET", "smp-fotos")
    ensure_bucket_exists(bucket_name)
    return MinioAdapter(get_minio_client(), bucket_name)


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
