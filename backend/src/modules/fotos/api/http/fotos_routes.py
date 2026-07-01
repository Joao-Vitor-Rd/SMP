import os
from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
import logging

from src.modules.fotos.application.dtos.foto_dto import (
    AtualizarLocalizacaoFotoInputDTO,
    ConfirmarRevisaoMapaDTO,
    ConfirmarRevisaoMapaItemDTO,
    FotoDeleteResponseDTO,
    FotoLocalizacaoResponseDTO,
    MapReviewInspectionDTO,
    FotoUploadResponseDTO,
    ImagemUploadInputDTO,
    ProcessamentoFotosResponseDTO,
)
from src.modules.fotos.application.use_case.uc_09 import Uc09UploadMultiplasImagensUseCase
from src.modules.fotos.application.use_case.uc_10_atualizar_localizacao_foto import (
    Uc10AtualizarLocalizacaoFotoUseCase,
)
from src.modules.fotos.infrastructure.repositories.foto_repository import FotoRepository
from src.modules.fotos.infrastructure.services.minio_adapter import MinioAdapter
from src.modules.fotos.infrastructure.services.minio_client import ensure_bucket_exists, get_minio_client
from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository
from src.modules.trechos.infrastructure.repositories.trecho_repository import TrechoRepository
from src.shared.auth.dependencies import verify_any_user, verify_supervisor_ou_tecnico
from src.shared.infrastructure.db import get_session
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(tags=["Fotos"])

logger = logging.getLogger(__name__)


def get_foto_storage() -> MinioAdapter:
    bucket_name = os.getenv("MINIO_BUCKET", "smp-fotos")
    ensure_bucket_exists(bucket_name)
    return MinioAdapter(get_minio_client(), bucket_name)


def get_foto_repository(session=Depends(get_session)) -> FotoRepository:
    return FotoRepository(session)


def get_trecho_repository(session=Depends(get_session)) -> TrechoRepository:
    return TrechoRepository(session)


def get_laudo_repository(session=Depends(get_session)) -> LaudoRepository:
    return LaudoRepository(session)


def get_uc09(
    foto_repository: FotoRepository = Depends(get_foto_repository),
    foto_storage: MinioAdapter = Depends(get_foto_storage),
    trecho_repository: TrechoRepository = Depends(get_trecho_repository),
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> Uc09UploadMultiplasImagensUseCase:
    return Uc09UploadMultiplasImagensUseCase(
        foto_repository=foto_repository,
        foto_storage=foto_storage,
        trecho_repository=trecho_repository,
        laudo_repository=laudo_repository,
    )


def get_uc10(
    foto_repository: FotoRepository = Depends(get_foto_repository),
) -> Uc10AtualizarLocalizacaoFotoUseCase:
    return Uc10AtualizarLocalizacaoFotoUseCase(foto_repository=foto_repository)


@router.get(
    "/revisao-mapa",
    response_model=list[MapReviewInspectionDTO],
    status_code=status.HTTP_200_OK,
    summary="Listar fotos para revisão de mapa",
    description="Retorna as fotos persistidas com dados suficientes para a tela de revisão do mapa",
)
async def listar_revisao_mapa(
    _: dict = Depends(verify_any_user),
    foto_repository: FotoRepository = Depends(get_foto_repository),
    foto_storage: MinioAdapter = Depends(get_foto_storage),
):
    fotos = foto_repository.list_all()

    return [
        MapReviewInspectionDTO(
            id=str(foto.id),
            foto_id=foto.id,
            file_name=foto.nome_original_arquivo,
            image_url=foto_storage.get_presigned_url(foto.caminho_arquivo),
            latitude=foto.latitude,
            longitude=foto.longitude,
            location_source="gps" if foto.latitude is not None and foto.longitude is not None else "fallback",
            location_exception=None if foto.latitude is not None and foto.longitude is not None else "sem_gps",
            status="ready" if foto.latitude is not None and foto.longitude is not None else "pending",
            note="Foto pronta para revisão." if foto.latitude is not None and foto.longitude is not None else "Foto sem localização (EXIF GPS não encontrado)",
            updated_at=foto.criado_em or datetime.now(timezone.utc),
        )
        for foto in fotos
    ]


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
                            },
                            "inspecao_id": {
                                "type": "integer",
                                "description": "ID da inspeção (laudo) à qual as fotos pertencem",
                            },
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
    inspecao_id_form: int | None = Form(None, alias="inspecao_id"),
    inspecao_id_query: int | None = Query(None, alias="inspecao_id"),
    x_inspecao_id: int | None = Header(None, alias="X-Inspecao-Id"),
    user_data: dict = Depends(verify_any_user),
    use_case: Uc09UploadMultiplasImagensUseCase = Depends(get_uc09),
):
    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo foi enviado")

    inspecao_id = inspecao_id_form if inspecao_id_form is not None else inspecao_id_query
    if inspecao_id is None and x_inspecao_id is not None:
        inspecao_id = x_inspecao_id

    arquivos = [
        ImagemUploadInputDTO(
            filename=file.filename or f"imagem-{index + 1}",
            content_type=file.content_type,
            content=await file.read(),
        )
        for index, file in enumerate(files)
    ]

    responsavel_id = None
    if user_data and user_data.get("sub"):
        try:
            responsavel_id = int(user_data.get("sub"))
        except Exception:
            pass

    try:
        resultado = await use_case.execute(
            arquivos,
            responsavel_id=responsavel_id,
            inspecao_id=inspecao_id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if resultado.success and not resultado.failed:
        status_code = status.HTTP_201_CREATED
    elif resultado.success or resultado.failed:
        status_code = status.HTTP_207_MULTI_STATUS
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
    _: dict = Depends(verify_supervisor_ou_tecnico),
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
    _: dict = Depends(verify_supervisor_ou_tecnico),
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


@router.patch(
    "/revisao-mapa/{foto_id}",
    response_model=FotoLocalizacaoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Atualizar localização de foto para revisão de mapa",
    description="Atualiza latitude/longitude da foto, com ou sem georreferenciamento original",
)
@router.patch(
    "/{foto_id}/localizacao",
    response_model=FotoLocalizacaoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Atualizar localização de foto",
    description="Atualiza latitude/longitude da foto, com ou sem georreferenciamento original",
)
async def atualizar_localizacao_foto(
    foto_id: str,
    payload: AtualizarLocalizacaoFotoInputDTO,
    _: dict = Depends(verify_any_user),
    use_case: Uc10AtualizarLocalizacaoFotoUseCase = Depends(get_uc10),
    foto_repository: FotoRepository = Depends(get_foto_repository),
):
    """Aceita `foto_id` como inteiro ou como identificador de caminho/nome.

    Se `foto_id` for um inteiro, delega para o use case padrão.
    Caso contrário, tenta localizar a foto por `caminho_arquivo`, `nome_aquivo` ou
    `nome_original_arquivo` e atualiza suas coordenadas diretamente.
    """
    logger.info("PATCH /revisao-mapa/%s called by user", foto_id)
    try:
        logger.debug("PATCH /revisao-mapa/%s payload: %s", foto_id, payload.model_dump() if hasattr(payload, 'model_dump') else str(payload))
    except Exception:
        logger.debug("PATCH /revisao-mapa/%s payload (unserializable)", foto_id)

    # tenta converter para inteiro (id numérico)
    try:
        numeric_id = int(foto_id)
        logger.debug("foto_id parsed as integer: %s", numeric_id)
    except (ValueError, TypeError):
        numeric_id = None
        logger.debug("foto_id is not an integer, will try path/name resolution: %s", foto_id)

    try:
        if numeric_id is not None:
            return use_case.execute(foto_id=numeric_id, input_dto=payload)

        # fallback: buscar por caminho ou nome do arquivo
        logger.debug("attempting find_by_path_or_name for: %s", foto_id)
        foto = foto_repository.find_by_path_or_name(foto_id)
        logger.debug("find_by_path_or_name returned: %s", foto)
        if foto is None or foto.id is None:
            logger.info("foto not found for identifier=%s", foto_id)
            raise HTTPException(status_code=404, detail="Foto nao encontrada")

        foto_atualizada = foto_repository.update_localizacao(
            foto_id=foto.id, latitude=payload.latitude, longitude=payload.longitude
        )
        if foto_atualizada is None:
            raise HTTPException(status_code=404, detail="Foto nao encontrada")

        return FotoLocalizacaoResponseDTO(
            id=foto_atualizada.id,
            latitude=foto_atualizada.latitude if foto_atualizada.latitude is not None else payload.latitude,
            longitude=foto_atualizada.longitude if foto_atualizada.longitude is not None else payload.longitude,
            trecho_id=foto_atualizada.trecho_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/revisao-mapa/confirmar",
    status_code=status.HTTP_200_OK,
    summary="Confirmar revisão de mapa (batch)",
    description="Aplica em lote as atualizações de localização enviadas pela revisão do mapa",
)
async def confirmar_revisao_no_servidor(
    payload: ConfirmarRevisaoMapaDTO,
    _: dict = Depends(verify_any_user),
    foto_repository: FotoRepository = Depends(get_foto_repository),
    use_case: Uc10AtualizarLocalizacaoFotoUseCase = Depends(get_uc10),
):
    logger.info("POST /revisao-mapa/confirmar called")
    if not payload.items:
        return JSONResponse(status_code=200, content={"updated": 0})

    updated = 0
    for item in payload.items:
        latitude = item.latitude
        longitude = item.longitude
        if latitude is None or longitude is None:
            continue

        identifier = item.foto_id or item.id or item.image_url or item.file_name

        # tentar id numérico primeiro
        numeric_id = None
        try:
            if identifier is not None:
                numeric_id = int(identifier)
        except Exception:
            numeric_id = None

        try:
            logger.debug("confirmar_revisao_no_servidor: processing identifier=%s lat=%s lng=%s", identifier, latitude, longitude)
            if numeric_id is not None:
                use_case.execute(foto_id=numeric_id, input_dto=AtualizarLocalizacaoFotoInputDTO(latitude=latitude, longitude=longitude))
                updated += 1
            else:
                foto = foto_repository.find_by_path_or_name(str(identifier)) if identifier is not None else None
                if foto and foto.id is not None:
                    logger.debug("confirmar_revisao_no_servidor: resolved identifier=%s to foto.id=%s", identifier, foto.id)
                    foto_repository.update_localizacao(foto.id, latitude, longitude)
                    updated += 1
                else:
                    logger.info("confirmar_revisao_no_servidor: could not resolve identifier=%s", identifier)
        except SQLAlchemyError:
            logger.exception("confirmar_revisao_no_servidor: database error for identifier=%s", identifier)
            continue
        except Exception:
            # ignorar falhas por item e continuar
            continue

    return JSONResponse(status_code=200, content={"updated": updated, "confirmed_at": payload.confirmed_at.isoformat() if payload.confirmed_at else None})
