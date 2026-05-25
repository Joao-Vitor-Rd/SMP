from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.modules.trechos.application.dtos.trecho_dto import TrechoListResponseDTO
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.application.use_case.uc_listar_trechos import UcListarTrechosUseCase
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
    response_model=TrechoListResponseDTO,
    summary="Listar trechos com fotos e localização",
    description="Retorna todos os trechos e as fotos associadas com latitude/longitude de cada foto",
)
async def listar_trechos(
    _: dict = Depends(verify_any_user),
    use_case: UcListarTrechosUseCase = Depends(get_uc_listar_trechos),
    bbox_filter: TrechoBoundingBoxFilterDTO | None = Depends(get_bbox_filter),
) -> TrechoListResponseDTO:
    return use_case.execute(bbox_filter=bbox_filter)
