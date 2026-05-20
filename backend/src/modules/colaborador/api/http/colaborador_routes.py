from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.shared.infrastructure.db import get_session
from src.modules.colaborador.application.use_case.uc_04 import CriarColaboradorUseCase
from src.modules.colaborador.application.use_case.uc_05 import AtualizarColaboradorUseCase
from src.modules.colaborador.application.use_case.alterar_acesso import AlternarAcessoLiberdoUseCase
from src.modules.colaborador.application.use_case.alterar_limite_acesso import AtualizarLimiteAcessoUseCase
from src.modules.colaborador.application.dtos.colaborador_dto import (
    CreateColaboradorDTO, 
    ColaboradorResponseDTO, 
    UpdateColaboradorDTO,
    AtualizarLimiteAcessoDTO
)
from src.modules.colaborador.infrastructure.repositories.ColaboradorRepository import ColaboradorRepository
from src.modules.auth.infrastructure.repositories.generic_user_repository import GenericUserRepository
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher
from src.shared.infrastructure.secret_criador_senha import SecretCriadorSenha 
from src.modules.noticacao.infrastructure.SmtpEmailNotificacao import SmtpEmailNotificacaoService
from src.shared.auth.dependencies import verify_supervisor_role, verify_colaborador_role, verify_supervisor_ou_tecnico
from src.shared.validators.email_validator import EmailValidator
from src.shared.validators.telefone_validator import TelefoneValidator
from src.shared.infrastructure.email_unico_validator import EmailUnicoValidator
from src.shared.validators.string_sem_numero_validator import StringSemNumeroValidator
import logging
import re

router = APIRouter(tags=["Colaboradores"])
logger = logging.getLogger(__name__)

def get_colaborador_repository(session: Annotated[Session, Depends(get_session)]):
    return ColaboradorRepository(session)

def get_user_repository(session: Annotated[Session, Depends(get_session)]):
    return GenericUserRepository(session)

def get_supervisor_repository(session: Annotated[Session, Depends(get_session)]):
    return SupervisorRepository(session)

def get_hasher():
    return Argon2PasswordHasher()

def get_criador_senha():
    return SecretCriadorSenha()

def get_email_sender():
    return SmtpEmailNotificacaoService()

def get_email_validator():
    return EmailValidator()

def get_string_validator():
    return StringSemNumeroValidator()

def get_telefone_validator():
    return TelefoneValidator()

def get_email_unico_validator(session: Annotated[Session, Depends(get_session)]):
    return EmailUnicoValidator(session)

@router.post(
    "/",
    response_model=ColaboradorResponseDTO,
    status_code=201,
    summary="Criar novo Colaborador",
    description="Cria um novo colaborador vinculado ao usuário autenticado (supervisor ou técnico), gerando senha automática e enviando por email"
)
async def criar_colaborador(
    create_data: CreateColaboradorDTO,
    payload: Annotated[dict, Depends(verify_supervisor_ou_tecnico)],
    colaborador_repo = Depends(get_colaborador_repository),
    user_repo = Depends(get_user_repository),
    supervisor_repo = Depends(get_supervisor_repository),
    hasher = Depends(get_hasher),
    criador_senha = Depends(get_criador_senha),
    email_sender = Depends(get_email_sender),
    email_validator = Depends(get_email_validator),
    telefone_validator = Depends(get_telefone_validator),
    email_unico_validator = Depends(get_email_unico_validator),
    string_validator = Depends(get_string_validator)
):
    try:
        logger.info(
            "Criar colaborador solicitado: role=%s sub=%s body_responsavel=%s nome=%s email=%s is_tecnico=%s",
            payload.get("role"),
            payload.get("sub"),
            create_data.id_profissional_responsavel,
            create_data.nome,
            create_data.email,
            create_data.is_tecnico,
        )

        if payload.get("role") == "tecnico":
            tecnico_logado = colaborador_repo.find_by_user_id(int(str(payload.get("sub"))))
            if not tecnico_logado:
                raise ValueError("Técnico logado não encontrado")

            create_data.id_profissional_responsavel = tecnico_logado.user_id
            logger.info(
                "Responsável normalizado para tecnico usando user_id=%s do colaborador.id=%s",
                create_data.id_profissional_responsavel,
                tecnico_logado.id,
            )

        use_case = CriarColaboradorUseCase(
            repository=colaborador_repo,
            repository_user=user_repo,
            repository_supervisor=supervisor_repo,
            criador_senha=criador_senha,
            hasher=hasher,
            email_sender=email_sender,
            email_validator=email_validator,
            telefone_validator=telefone_validator,
            email_unico_validator=email_unico_validator,
            string_sem_numero_validator=string_validator
        )
        return use_case.execute(create_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar colaborador: {str(e)}")


@router.get(
    "/",
    response_model=List[ColaboradorResponseDTO],
    status_code=200,
    summary="Listar todos os Colaboradores",
    description="Retorna a lista de todos os colaboradores cadastrados no sistema"
)
async def listar_colaboradores(
    _: Annotated[dict, Depends(verify_supervisor_role)],
    colaborador_repo = Depends(get_colaborador_repository)
):
    try:
        colaboradores = colaborador_repo.find_all()
        return colaboradores
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar colaboradores: {str(e)}")


@router.delete(
    "/{colaborador_id}",
    status_code=204,
    summary="Deletar Colaborador",
    description="Remove um colaborador do sistema pelo ID"
)
async def deletar_colaborador(
    colaborador_id: int,
    _: Annotated[dict, Depends(verify_supervisor_role)],
    colaborador_repo = Depends(get_colaborador_repository)
):
    try:
        colaborador_repo.delete(colaborador_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar colaborador: {str(e)}")


@router.put(
    "/me",
    response_model=ColaboradorResponseDTO,
    status_code=200,
    summary="Atualizar meu perfil de colaborador",
    description="Atualiza apenas o perfil do usuário autenticado usando o sub do JWT, sem aceitar id pelo cliente"
)
async def atualizar_meu_perfil(
    update_data: UpdateColaboradorDTO,
    payload: Annotated[dict, Depends(verify_colaborador_role)],
    colaborador_repo = Depends(get_colaborador_repository),
    string_validator = Depends(get_string_validator),
    telefone_validator = Depends(get_telefone_validator),
):
    try:
        user_id_raw = payload.get("sub")
        if not user_id_raw:
            raise HTTPException(status_code=401, detail="Token inválido")

        user_id = int(str(user_id_raw))
        use_case = AtualizarColaboradorUseCase(
            colaborador_repo,
            string_validator,
            telefone_validator,
        )
        return use_case.execute(user_id, update_data)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar colaborador: {str(e)}")


@router.patch(
    "/{colaborador_id}/acesso",
    response_model=ColaboradorResponseDTO,
    status_code=200,
    summary="Alternar acesso_liberado do colaborador",
    description="Alterna o valor de acesso_liberado (liberado/bloqueado) de um colaborador"
)
async def alternar_acesso_colaborador(
    colaborador_id: int,
    _: Annotated[dict, Depends(verify_supervisor_role)],
    colaborador_repo = Depends(get_colaborador_repository)
):
    try:
        use_case = AlternarAcessoLiberdoUseCase(colaborador_repo)
        return use_case.execute(colaborador_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao alternar acesso: {str(e)}")


@router.patch(
    "/{colaborador_id}/limite-acesso",
    response_model=ColaboradorResponseDTO,
    status_code=200,
    summary="Atualizar limite de acesso do colaborador",
    description="Atualiza a data de limite de acesso do colaborador com validações (não pode ser no passado)"
)
async def atualizar_limite_acesso_colaborador(
    colaborador_id: int,
    update_data: AtualizarLimiteAcessoDTO,
    _: Annotated[dict, Depends(verify_supervisor_role)],
    colaborador_repo = Depends(get_colaborador_repository)
):
    try:
        use_case = AtualizarLimiteAcessoUseCase(colaborador_repo)
        return use_case.execute(colaborador_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar limite de acesso: {str(e)}")
