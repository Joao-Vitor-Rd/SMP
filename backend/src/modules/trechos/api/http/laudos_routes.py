from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.shared.infrastructure.db import get_session
from src.shared.auth.dependencies import verify_any_user

from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository
from src.modules.trechos.application.dtos.laudo_dto import LaudoCreateDTO, LaudoResponseDTO
from src.modules.trechos.application.use_case.uc_criar_laudo import CriarLaudoUseCase
from src.modules.trechos.application.use_case.uc_listar_laudos import ListarLaudosUseCase
from src.modules.trechos.application.use_case.uc_buscar_laudo_por_id import BuscarLaudoPorIdUseCase


router = APIRouter(tags=["Laudos"])


def get_laudo_repository(session: Annotated[Session, Depends(get_session)]) -> LaudoRepository:
    return LaudoRepository(session)


def get_uc_criar_laudo(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> CriarLaudoUseCase:
    return CriarLaudoUseCase(laudo_repository=laudo_repository)


def get_uc_listar_laudos(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> ListarLaudosUseCase:
    return ListarLaudosUseCase(laudo_repository=laudo_repository)


def get_uc_buscar_laudo_por_id(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> BuscarLaudoPorIdUseCase:
    return BuscarLaudoPorIdUseCase(laudo_repository=laudo_repository)


@router.post(
    "/",
    response_model=LaudoResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo Laudo",
    description="Cria um novo laudo associando os usuários fornecidos pelo ID."
)
async def criar_laudo(
    create_data: LaudoCreateDTO,
    _: Annotated[dict, Depends(verify_any_user)],
    use_case: CriarLaudoUseCase = Depends(get_uc_criar_laudo),
) -> LaudoResponseDTO:
    try:
        return use_case.execute(
            responsavel=create_data.responsavel,
            colaboradores_ids=create_data.colaboradores_ids,
            data=create_data.data,
            resumo=create_data.resumo,
            credencial_responsavel=create_data.credencial_responsavel
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar laudo: {str(e)}"
        )


@router.get(
    "/",
    response_model=List[LaudoResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Listar todos os Laudos",
    description="Retorna uma lista com todos os laudos cadastrados no sistema, ordenados por data decrescente."
)
async def listar_laudos(
    _: Annotated[dict, Depends(verify_any_user)],
    use_case: ListarLaudosUseCase = Depends(get_uc_listar_laudos),
) -> List[LaudoResponseDTO]:
    try:
        return use_case.execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar laudos: {str(e)}"
        )


@router.get(
    "/{laudo_id}",
    response_model=LaudoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Buscar Laudo por ID",
    description="Busca e retorna as informações de um laudo específico pelo seu ID."
)
async def buscar_laudo_por_id(
    laudo_id: int,
    _: Annotated[dict, Depends(verify_any_user)],
    use_case: BuscarLaudoPorIdUseCase = Depends(get_uc_buscar_laudo_por_id),
) -> LaudoResponseDTO:
    try:
        laudo = use_case.execute(laudo_id)
        if laudo is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Laudo com ID {laudo_id} não encontrado."
            )
        return laudo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar laudo: {str(e)}"
        )
