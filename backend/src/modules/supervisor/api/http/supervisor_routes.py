from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.shared.infrastructure.db import get_session
from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.application.user_case.uc_01 import CriarSupervisorUseCase
from src.modules.supervisor.application.user_case.ListarSupervisorUseCase import ListarSupervisorUseCase
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.modules.supervisor.infrastructure.gateway.validador_crea_api import ValidadorCREAApi
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher

router = APIRouter()

def get_repository(session: Annotated[Session, Depends(get_session)]):
    return SupervisorRepository(session)

def get_validador_crea():
    return ValidadorCREAApi()

def get_hasher():
    return Argon2PasswordHasher()

@router.post("/", response_model=Supervisor, status_code=201)
async def criar_supervisor(
    supervisor: Supervisor,
    repository = Depends(get_repository),
    validador_crea = Depends(get_validador_crea),
    hasher = Depends(get_hasher)
):
    try:
        use_case = CriarSupervisorUseCase(repository, validador_crea, hasher)
        return use_case.execute(supervisor)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar supervisor: {str(e)}")

@router.get("/", response_model=list[Supervisor])
async def listar_supervisores(
    repository = Depends(get_repository)
):
    try:
        use_case = ListarSupervisorUseCase(repository)
        return use_case.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar supervisores: {str(e)}")

