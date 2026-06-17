from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from sqlalchemy import update # type: ignore
from sqlalchemy.orm import Session # type: ignore
from pydantic import BaseModel # type: ignore

from src.shared.infrastructure.db import get_session
from src.shared.auth.dependencies import verify_any_user

from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository
from src.modules.trechos.application.dtos.laudo_dto import LaudoCreateDTO, LaudoResponseDTO
from src.modules.trechos.application.use_case.uc_criar_laudo import CriarLaudoUseCase
from src.modules.trechos.application.use_case.uc_listar_laudos import ListarLaudosUseCase
from src.modules.trechos.application.use_case.uc_buscar_laudo_por_id import BuscarLaudoPorIdUseCase


router = APIRouter(tags=["Laudos"])


class AtualizarDataLaudoDTO(BaseModel):
    data: str


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
    description="Retorna uma lista com todos os laudos cadastrados no sistema conforme as permissões do usuário."
)
async def listar_laudos(
    current_user: Annotated[dict, Depends(verify_any_user)],
    use_case: ListarLaudosUseCase = Depends(get_uc_listar_laudos),
) -> Any:
    try:
        user_id = current_user.get("id")
        cargo = current_user.get("cargo")
        return use_case.execute(user_id=user_id, cargo=cargo)
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


@router.patch(
    "/{laudo_id}/",
    status_code=status.HTTP_200_OK,
    summary="Atualizar data do Laudo via metadados EXIF",
    description="Atualiza parcialmente a propriedade de data do laudo quando metadados válidos são enviados pelo frontend."
)
async def atualizar_data_laudo(
    laudo_id: int,
    body: AtualizarDataLaudoDTO,
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[dict, Depends(verify_any_user)],
    buscar_use_case: BuscarLaudoPorIdUseCase = Depends(get_uc_buscar_laudo_por_id),
):
    from src.modules.trechos.domain.entities.laudo import LaudoORM

    try:
        laudo_existente = buscar_use_case.execute(laudo_id)

        if laudo_existente is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Laudo com ID {laudo_id} não encontrado."
            )

        stmt = (
            update(LaudoORM)
            .where(LaudoORM.id == laudo_id)
            .values(data=body.data)
        )
        session.execute(stmt)
        session.commit()

        return {"success": True, "message": "Data do laudo atualizada com sucesso pelo EXIF."}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar a data do laudo: {str(e)}"
        )