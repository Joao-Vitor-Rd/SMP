from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.shared.infrastructure.db import get_session
from src.modules.colaborador.application.use_case.uc_04 import CriarColaboradorUseCase
from src.modules.colaborador.application.dtos.colaborador_dto import CreateColaboradorDTO, ColaboradorResponseDTO
from src.modules.colaborador.infrastructure.repositories.ColaboradorRepository import ColaboradorRepository
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher
from src.shared.infrastructure.secret_criador_senha import SecretCriadorSenha 
from src.modules.noticacao.infrastructure.SmtpEmailNotificacao import SmtpEmailNotificacaoService
from src.shared.auth.dependencies import verify_supervisor_role
from src.shared.validators.email_validator import EmailValidator
from src.shared.validators.telefone_validator import TelefoneValidator
from src.shared.infrastructure.email_unico_validator import EmailUnicoValidator
from src.shared.validators.string_sem_numero_validator import StringSemNumeroValidator

router = APIRouter(tags=["Colaboradores"])

def get_colaborador_repository(session: Annotated[Session, Depends(get_session)]):
    return ColaboradorRepository(session)

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
    description="Cria um novo colaborador vinculado a um supervisor, gerando senha automática e enviando por email"
)
async def criar_colaborador(
    create_data: CreateColaboradorDTO,
    _: Annotated[dict, Depends(verify_supervisor_role)],
    colaborador_repo = Depends(get_colaborador_repository),
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
        use_case = CriarColaboradorUseCase(
            repository=colaborador_repo,
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
