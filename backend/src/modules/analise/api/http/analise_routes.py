from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.modules.analise.application.dtos.analise_dto import (
    AnalysisStatusResponseDTO,
    LaudoAnaliseDTO,
    TriggerAnalysisResponseDTO,
)
from src.modules.analise.application.use_case.uc_consultar_status_analise import (
    ConsultarStatusAnaliseUseCase,
)
from src.modules.analise.application.use_case.uc_buscar_laudo_analise import (
    BuscarLaudoAnaliseUseCase,
)
from src.modules.analise.application.use_case.uc_disparar_analise import DispararAnaliseUseCase
from src.modules.analise.application.use_case.uc_salvar_laudo_revisado import (
    SalvarLaudoRevisadoUseCase,
)
from src.modules.analise.infrastructure.repositories.deteccao_repository import DeteccaoRepository
from src.modules.analise.infrastructure.stores.redis_analise_job_store import RedisAnaliseJobStore
from src.modules.analise.infrastructure.tasks.arq_pool import get_arq_pool
from src.modules.fotos.infrastructure.repositories.foto_repository import FotoRepository
from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository
from src.shared.auth.dependencies import verify_any_user
from src.shared.infrastructure.db import get_session

router = APIRouter(tags=["Análise IA"])


@router.post(
    "/{inspecao_id}/analisar",
    response_model=TriggerAnalysisResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Disparar análise por IA",
    description="Valida pré-condições (CA1), enfileira a análise assíncrona e retorna o job_id.",
)
async def disparar_analise(
    inspecao_id: int,
    _: Annotated[dict, Depends(verify_any_user)],
    session: Session = Depends(get_session),
) -> TriggerAnalysisResponseDTO:
    try:
        queue = await get_arq_pool()
        use_case = DispararAnaliseUseCase(
            laudo_repository=LaudoRepository(session),
            foto_repository=FotoRepository(session),
            job_store=RedisAnaliseJobStore(),
            queue=queue,
        )
        job_id = await use_case.execute(inspecao_id)
        return TriggerAnalysisResponseDTO(job_id=job_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao iniciar análise de IA: {exc}",
        )


@router.get(
    "/analise/{job_id}/status",
    response_model=AnalysisStatusResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Consultar status da análise",
    description="Polling do job de análise. Retorna 404 se inexistente ou expirado.",
)
async def consultar_status_analise(
    job_id: str,
    _: Annotated[dict, Depends(verify_any_user)],
) -> AnalysisStatusResponseDTO:
    use_case = ConsultarStatusAnaliseUseCase(job_store=RedisAnaliseJobStore())
    result = await use_case.execute(job_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Análise não encontrada ou expirada.",
        )
    return result


@router.get(
    "/{inspecao_id}/laudo",
    response_model=LaudoAnaliseDTO,
    status_code=status.HTTP_200_OK,
    summary="Buscar laudo de análise já salvo",
    description=(
        "Retorna as detecções já salvas (via análise de IA e/ou revisão manual) "
        "para a inspeção. Retorna 404 se ainda não houver análise para essa inspeção."
    ),
)
async def buscar_laudo_analise(
    inspecao_id: int,
    _: Annotated[dict, Depends(verify_any_user)],
    session: Session = Depends(get_session),
) -> LaudoAnaliseDTO:
    use_case = BuscarLaudoAnaliseUseCase(deteccao_repository=DeteccaoRepository(session))
    result = use_case.execute(inspecao_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhuma análise encontrada para a inspeção {inspecao_id}.",
        )
    return result


@router.put(
    "/{inspecao_id}/laudo",
    response_model=LaudoAnaliseDTO,
    status_code=status.HTTP_200_OK,
    summary="Salvar laudo revisado",
    description="Persiste as detecções revisadas/editadas pelo usuário antes da publicação.",
)
async def salvar_laudo_revisado(
    inspecao_id: int,
    laudo: LaudoAnaliseDTO,
    _: Annotated[dict, Depends(verify_any_user)],
    session: Session = Depends(get_session),
) -> LaudoAnaliseDTO:
    try:
        use_case = SalvarLaudoRevisadoUseCase(deteccao_repository=DeteccaoRepository(session))
        return use_case.execute(inspecao_id, laudo)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar laudo revisado: {exc}",
        )