from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from sqlalchemy import update # type: ignore
from sqlalchemy.orm import Session # type: ignore
from pydantic import BaseModel # type: ignore

from src.shared.infrastructure.db import get_session
from src.shared.auth.dependencies import verify_any_user

from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository
from src.modules.trechos.infrastructure.repositories.trecho_repository import TrechoRepository
from src.modules.fotos.infrastructure.repositories.foto_repository import FotoRepository
from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM
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
from src.modules.trechos.application.use_case.uc_buscar_trecho_por_laudo import (
    BuscarTrechoPorLaudoUseCase,
    TrechoRelacionadoDTO,
)

router = APIRouter(tags=["Laudos"])


class AtualizarDataLaudoDTO(BaseModel):
    data: str


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


def get_uc_buscar_trecho_por_laudo(
    session: Session = Depends(get_session),
) -> BuscarTrechoPorLaudoUseCase:
    return BuscarTrechoPorLaudoUseCase(
        foto_repository=FotoRepository(session),
        trecho_repository=TrechoRepository(session),
        laudo_repository=LaudoRepository(session),
    )


@router.post(
    "/",
    response_model=LaudoResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo Laudo",
    description="Cria um novo laudo associando os usuários fornecidos pelo ID."
)
async def criar_laudo(
    create_data: LaudoCreateDTO,
    current_user: Annotated[dict, Depends(verify_any_user)],
    session: Annotated[Session, Depends(get_session)],
    use_case: CriarLaudoUseCase = Depends(get_uc_criar_laudo),
) -> LaudoResponseDTO:
    try:
        # Garante que o usuário que está criando o laudo sempre tenha acesso a ele,
        # independente do que o frontend enviar em colaboradores_ids. Sem isso,
        # técnicos/colaboradores podem criar um laudo e não conseguir vê-lo depois
        # (list_by_usuario filtra laudos pelo Colaborador vinculado ao usuário).
        # colaboradores_ids referencia ColaboradorORM.id, não UserORM.id — por isso
        # é preciso resolver o Colaborador correspondente ao usuário logado.
        colaboradores_ids = list(create_data.colaboradores_ids or [])
        current_user_id = current_user.get("id")
        if current_user_id is not None:
            colaborador_atual = (
                session.query(ColaboradorORM)
                .filter(ColaboradorORM.user_id == current_user_id)
                .first()
            )
            if colaborador_atual is not None and colaborador_atual.id not in colaboradores_ids:
                colaboradores_ids.append(colaborador_atual.id)

        return use_case.execute(
            responsavel=create_data.responsavel,
            colaboradores_ids=colaboradores_ids,
            data=create_data.data,
            resumo=create_data.resumo,
            credencial_responsavel=create_data.credencial_responsavel,
            trecho_id=create_data.trecho_id,
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
    description="Retorna uma lista com todos os laudos cadastrados no sistema conforme as permissões do usuário."
)
async def listar_laudos(
    current_user: Annotated[dict, Depends(verify_any_user)],
    use_case: ListarLaudosUseCase = Depends(get_uc_listar_laudos),
):
    try:
        cargo = current_user.get("cargo", "")
        is_tecnico = cargo in ("tecnico", "colaborador")

        user_id = current_user.get("id") if is_tecnico else None

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


@router.get(
    "/{laudo_id}/trecho",
    response_model=TrechoRelacionadoDTO,
    status_code=status.HTTP_200_OK,
    summary="Buscar trecho relacionado ao laudo",
    description=(
        "Descobre a qual Trecho este laudo pertence (via as fotos vinculadas) e "
        "retorna a classificação de qualidade, cidade/UF e os IDs de outros "
        "laudos do mesmo trecho — usado para histórico e comparativo no "
        "relatório. Retorna 404 se o laudo não tiver fotos associadas a um "
        "trecho ainda."
    ),
)
async def buscar_trecho_por_laudo(
    laudo_id: int,
    _: Annotated[dict, Depends(verify_any_user)],
    use_case: BuscarTrechoPorLaudoUseCase = Depends(get_uc_buscar_trecho_por_laudo),
) -> TrechoRelacionadoDTO:
    result = use_case.execute(laudo_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum trecho encontrado para o laudo {laudo_id} (sem fotos vinculadas a um trecho).",
        )
    return result


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