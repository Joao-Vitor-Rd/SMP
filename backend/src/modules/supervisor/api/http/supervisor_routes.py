from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.shared.infrastructure.db import get_session
from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.application.user_case.uc_01 import CriarSupervisorUseCase
from src.modules.supervisor.application.user_case.ListarSupervisorUseCase import ListarSupervisorUseCase
from src.modules.supervisor.application.dtos import CreateSupervisorDTO, SupervisorResponseDTO
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.modules.supervisor.infrastructure.gateway.validador_crea_api import ValidadorCREAApi
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher
from src.shared.validators.email_validator import EmailValidator
from src.shared.infrastructure.email_unico_validator import EmailUnicoValidator
from src.shared.validators.string_sem_numero_validator import StringSemNumeroValidator

router = APIRouter(tags=["Supervisores"])

def get_repository(session: Annotated[Session, Depends(get_session)]):
    return SupervisorRepository(session)

def get_validador_crea():
    return ValidadorCREAApi()

def get_hasher():
    return Argon2PasswordHasher()

def get_email_validator():
    return EmailValidator()

def get_string_validator():
    return StringSemNumeroValidator()

def get_email_unico_validator(session: Annotated[Session, Depends(get_session)]):
    return EmailUnicoValidator(session)

@router.post(
    "/",
    response_model=SupervisorResponseDTO,
    status_code=201,
    summary="Criar novo Supervisor",
    description="Cria um novo supervisor após validar CREA, email e outros dados obrigatórios"
)
async def criar_supervisor(
    create_data: CreateSupervisorDTO,
    repository = Depends(get_repository),
    validador_crea = Depends(get_validador_crea),
    hasher = Depends(get_hasher),
    email_validator = Depends(get_email_validator),
    email_unico_validator = Depends(get_email_unico_validator),
    string_validator = Depends(get_string_validator)
):
    try:
        use_case = CriarSupervisorUseCase(
            repository, 
            validador_crea, 
            hasher, 
            email_validator, 
            email_unico_validator,
            string_validator
        )
        return use_case.execute(create_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar supervisor: {str(e)}")

@router.get(
    "/",
    response_model=list[SupervisorResponseDTO],
    summary="Listar Supervisores",
    description="Retorna a lista de todos os supervisores cadastrados no sistema"
)
async def listar_supervisores(
    repository = Depends(get_repository)
):
    try:
        use_case = ListarSupervisorUseCase(repository)
        return use_case.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar supervisores: {str(e)}")

