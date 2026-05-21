from fastapi import APIRouter, Depends

from src.modules.trechos.application.dtos.trecho_dto import TrechoListResponseDTO
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


@router.get(
    "/",
    response_model=TrechoListResponseDTO,
    summary="Listar trechos com fotos e localização",
    description="Retorna todos os trechos e as fotos associadas com latitude/longitude de cada foto",
)
async def listar_trechos(
    _: dict = Depends(verify_any_user),
    use_case: UcListarTrechosUseCase = Depends(get_uc_listar_trechos),
) -> TrechoListResponseDTO:
    return use_case.execute()
