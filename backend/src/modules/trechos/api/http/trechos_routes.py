from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.modules.trechos.application.dtos.trecho_dto import (
    PaginatedTrechoListResponseDTO,
    TrechoListItemDTO,
    TrechoUpdateDTO,
)
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.application.use_case.uc_listar_trechos import UcListarTrechosUseCase
from src.modules.trechos.application.use_case.uc_atualizar_trecho import UcAtualizarTrechoUseCase
from src.modules.trechos.infrastructure.repositories.trecho_repository import TrechoRepository
from src.shared.auth.dependencies import verify_any_user
from src.shared.infrastructure.db import get_session

router = APIRouter(tags=["Trechos"])


def get_trecho_repository(session=Depends(get_session)) -> TrechoRepository:
    return TrechoRepository(session)


def get_uc_listar_trechos(
    trecho_repository: TrechoRepository = Depends(get_trecho_repository),
) -> UcListarTrechosUseCase:
    return UcListarTrechosUseCase(trecho_repository=trecho_repository)


def get_uc_atualizar_trecho(
    trecho_repository: TrechoRepository = Depends(get_trecho_repository),
) -> UcAtualizarTrechoUseCase:
    return UcAtualizarTrechoUseCase(trecho_repository=trecho_repository)


def get_bbox_filter(
    top_left_lat: float | None = Query(
        default=None,
        alias="topLeftLat",
        ge=-90,
        le=90,
    ),
    top_left_lng: float | None = Query(
        default=None,
        alias="topLeftLng",
        ge=-180,
        le=180,
    ),
    bottom_right_lat: float | None = Query(
        default=None,
        alias="bottomRightLat",
        ge=-90,
        le=90,
    ),
    bottom_right_lng: float | None = Query(
        default=None,
        alias="bottomRightLng",
        ge=-180,
        le=180,
    ),
) -> TrechoBoundingBoxFilterDTO | None:
    has_any_filter = any(
        value is not None
        for value in (top_left_lat, top_left_lng, bottom_right_lat, bottom_right_lng)
    )
    has_all_filters = all(
        value is not None
        for value in (top_left_lat, top_left_lng, bottom_right_lat, bottom_right_lng)
    )

    if not has_any_filter:
        return None

    if not has_all_filters:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Para filtrar por área do mapa, informe todos os parâmetros: "
                "topLeftLat, topLeftLng, bottomRightLat e bottomRightLng."
            ),
        )

    assert top_left_lat is not None
    assert top_left_lng is not None
    assert bottom_right_lat is not None
    assert bottom_right_lng is not None

    if top_left_lat < bottom_right_lat:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="topLeftLat deve ser maior ou igual a bottomRightLat.",
        )

    if top_left_lng > bottom_right_lng:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="topLeftLng deve ser menor ou igual a bottomRightLng.",
        )

    return TrechoBoundingBoxFilterDTO(
        top_left_lat=top_left_lat,
        top_left_lng=top_left_lng,
        bottom_right_lat=bottom_right_lat,
        bottom_right_lng=bottom_right_lng,
    )


@router.get(
    "/",
    response_model=PaginatedTrechoListResponseDTO,
    summary="Listar trechos com fotos, localização, filtros e paginação",
    description="Retorna os trechos e fotos associadas paginados e filtrados.",
)
async def listar_trechos(
    cidade: str | None = Query(default=None),
    uf: str | None = Query(default=None),
    responsavel_tecnico: str | None = Query(default=None, alias="responsavelTecnico"),
    classificacao_qualidade: str | None = Query(default=None, alias="classificacaoQualidade"),
    data_inicio: datetime | None = Query(default=None, alias="dataInicio"),
    data_fim: datetime | None = Query(default=None, alias="dataFim"),
    meus_trabalhos: bool = Query(default=False, alias="meusTrabalhos"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    user_data: dict = Depends(verify_any_user),
    use_case: UcListarTrechosUseCase = Depends(get_uc_listar_trechos),
    bbox_filter: TrechoBoundingBoxFilterDTO | None = Depends(get_bbox_filter),
) -> PaginatedTrechoListResponseDTO:
    responsavel_id = None
    if meus_trabalhos:
        if user_data and user_data.get("sub"):
            try:
                responsavel_id = int(user_data.get("sub"))
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuário não autenticado ou inválido para filtrar 'Meus Trabalhos'."
                )

    return use_case.execute(
        bbox_filter=bbox_filter,
        cidade=cidade,
        uf=uf,
        responsavel_tecnico=responsavel_tecnico,
        classificacao_qualidade=classificacao_qualidade,
        data_inicio=data_inicio,
        data_fim=data_fim,
        responsavel_id=responsavel_id,
        page=page,
        limit=limit,
    )


@router.put(
    "/{id_trecho}",
    response_model=TrechoListItemDTO,
    summary="Atualizar um Trecho existente",
    description="Atualiza cidade, uf, responsavelTecnico, classificacaoQualidade e defeitos de um Trecho.",
)
async def atualizar_trecho(
    id_trecho: str,
    payload: TrechoUpdateDTO,
    _: dict = Depends(verify_any_user),
    use_case: UcAtualizarTrechoUseCase = Depends(get_uc_atualizar_trecho),
) -> TrechoListItemDTO:
    try:
        return use_case.execute(id_trecho=id_trecho, dto=payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
