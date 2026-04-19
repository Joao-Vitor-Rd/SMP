from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.shared.infrastructure.db import get_session
from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.application.user_case.uc_01 import CriarSupervisorUseCase
from src.modules.supervisor.application.user_case.uc_02 import LoginSupervisorUseCase
from src.modules.supervisor.application.user_case.ListarSupervisorUseCase import ListarSupervisorUseCase
from src.shared.auth.dtos import LoginDTO, LoginResponseDTO
from src.modules.supervisor.application.dtos import CreateSupervisorDTO, SupervisorResponseDTO
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.modules.supervisor.infrastructure.gateway.validador_crea_api import ValidadorCREAApi
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher
from src.shared.auth.jwt_service import JWTService

router = APIRouter()

def get_repository(session: Annotated[Session, Depends(get_session)]):
    return SupervisorRepository(session)

def get_validador_crea():
    return ValidadorCREAApi()

def get_hasher():
    return Argon2PasswordHasher()

def get_token_service():
    return JWTService()

@router.post("/", response_model=SupervisorResponseDTO, status_code=201)
async def criar_supervisor(
    create_data: CreateSupervisorDTO,
    repository = Depends(get_repository),
    validador_crea = Depends(get_validador_crea),
    hasher = Depends(get_hasher)
):
    try:
        use_case = CriarSupervisorUseCase(repository, validador_crea, hasher)
        return use_case.execute(create_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar supervisor: {str(e)}")

@router.get("/", response_model=list[SupervisorResponseDTO])
async def listar_supervisores(
    repository = Depends(get_repository)
):
    try:
        use_case = ListarSupervisorUseCase(repository)
        return use_case.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar supervisores: {str(e)}")

@router.post("/login", response_model=LoginResponseDTO, status_code=200)
async def login(
    login_data: LoginDTO,
    repository = Depends(get_repository),
    hasher = Depends(get_hasher),
    token_service = Depends(get_token_service)
):
    try:
        use_case = LoginSupervisorUseCase(repository, hasher, token_service)
        return use_case.execute(login_data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao fazer login: {str(e)}")


