from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.shared.infrastructure.db import get_session
from src.shared.auth.dependencies import verify_any_user

from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository
from src.modules.trechos.application.dtos.laudo_dto import (
    LaudoCreateDTO,
    LaudoResponseDTO,
    LaudoUpdateDTO,
    LaudoPublicacaoCreateDTO,
    LaudoPublicadoDTO,
)
from src.modules.trechos.application.use_case.uc_criar_laudo import CriarLaudoUseCase
from src.modules.trechos.application.use_case.uc_listar_laudos import ListarLaudosUseCase
from src.modules.trechos.application.use_case.uc_buscar_laudo_por_id import BuscarLaudoPorIdUseCase
from src.modules.trechos.application.use_case.uc_atualizar_laudo import AtualizarLaudoUseCase
from src.modules.trechos.application.use_case.uc_publicar_laudo import PublicarLaudoUseCase

router = APIRouter(tags=["Laudos"])


def get_laudo_repository(session: Annotated[Session, Depends(get_session)]) -> LaudoRepository:
    return LaudoRepository(session)


def get_uc_criar_laudo(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> CriarLaudoUseCase:
    return CriarLaudoUseCase(laudo_repository=laudo_repository)

def get_uc_atualizar_laudo(
    session: Session = Depends(get_session),
) -> AtualizarLaudoUseCase:
    repository = LaudoRepository(session)

    return AtualizarLaudoUseCase(
        laudo_repository=repository
    )

def get_uc_listar_laudos(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> ListarLaudosUseCase:
    return ListarLaudosUseCase(laudo_repository=laudo_repository)


def get_uc_buscar_laudo_por_id(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> BuscarLaudoPorIdUseCase:
    return BuscarLaudoPorIdUseCase(laudo_repository=laudo_repository)


def get_uc_publicar_laudo(
    laudo_repository: LaudoRepository = Depends(get_laudo_repository),
) -> PublicarLaudoUseCase:
    return PublicarLaudoUseCase(laudo_repository=laudo_repository)


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
    
@router.post(
    "/{laudo_id}/publicar",
    response_model=LaudoPublicadoDTO,
    status_code=status.HTTP_200_OK,
    summary="Publicar Laudo",
    description="Publica (finaliza) um laudo já revisado, registrando o resumo e a data de publicação."
)
async def publicar_laudo(
    laudo_id: int,
    dados: LaudoPublicacaoCreateDTO,
    _: Annotated[dict, Depends(verify_any_user)],
    use_case: PublicarLaudoUseCase = Depends(get_uc_publicar_laudo),
) -> LaudoPublicadoDTO:
    try:
        return use_case.execute(laudo_id=laudo_id, dto=dados)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao publicar laudo: {str(e)}"
        )


@router.put(
    "/{laudo_id}",
    response_model=LaudoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Atualizar Laudo",
    description="Atualiza um laudo existente."
)
async def atualizar_laudo(
    laudo_id: int,
    update_data: LaudoUpdateDTO,
    _: Annotated[dict, Depends(verify_any_user)],
    use_case: AtualizarLaudoUseCase = Depends(get_uc_atualizar_laudo),
) -> LaudoResponseDTO:
    try:
        return use_case.execute(
            laudo_id=laudo_id,
            dto=update_data,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar laudo: {str(e)}"
        )

@router.get(
    "/",
    response_model=List[LaudoResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Listar todos os Laudos",
    description="Retorna laudos do usuário logado. Supervisores veem todos; técnicos veem apenas os seus."
)
async def listar_laudos(
    current_user: Annotated[dict, Depends(verify_any_user)],
    use_case: ListarLaudosUseCase = Depends(get_uc_listar_laudos),
):
    try:
        cargo = current_user.get("cargo", "")
        is_tecnico = cargo in ("tecnico", "colaborador")

        usuario_id = current_user.get("id") if is_tecnico else None

        return use_case.execute(usuario_id=usuario_id)
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