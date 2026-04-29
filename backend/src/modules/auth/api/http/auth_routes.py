from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from src.shared.infrastructure.db import get_session
from src.shared.infrastructure.redis_config import RedisClient
from src.modules.auth.application.dtos.login_dto import LoginDTO, LoginResponseDTO, RefreshTokenDTO, RefreshTokenResponseDTO
from src.modules.auth.application.use_cases.login_use_case import LoginUseCase
from src.modules.auth.application.use_cases.refresh_token_use_case import RefreshTokenUseCase
from src.modules.auth.infrastructure.repositories.generic_user_repository import GenericUserRepository
from src.modules.auth.infrastructure.services.limitador_redis import LimitadorRedis
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher
from src.shared.auth.jwt_service import JWTService
from src.shared.auth.dependencies import verify_supervisor_role
import asyncio
from src.modules.supervisor.application.dtos.supervisor_dto import SupervisorResponseDTO

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def get_repository(session: Annotated[Session, Depends(get_session)]):
    return GenericUserRepository(session)


def get_hasher():
    return Argon2PasswordHasher()


def get_token_service():
    return JWTService()


async def get_limitador():
    """Dependency para obter instância do limitador Redis"""
    redis_client = await RedisClient.get_client()
    return LimitadorRedis(redis_client)


def get_client_ip(request: Request) -> str:
    """Extrai o IP do cliente (considerando proxy)"""
    if request.client:
        return request.client.host
    return "unknown"


@router.post(
    "/login",
    response_model=LoginResponseDTO,
    status_code=200,
    summary="Autenticar Usuário",
    description="Realiza login de supervisor ou colaborador com validação de credenciais e retorna tokens JWT"
)
async def login(
    login_data: LoginDTO,
    request: Request,
    repository = Depends(get_repository),
    hasher = Depends(get_hasher),
    token_service = Depends(get_token_service),
    limitador = Depends(get_limitador)
):
    try:
        ip_user = get_client_ip(request)
        use_case = LoginUseCase(repository, hasher, token_service, limitador)
        return await use_case.execute(login_data, ip_user)
    except ValueError as e:
        detail = str(e)
        if detail.isdigit():
            tentativas = int(detail)
            if tentativas >= 5:
                proxima_tentativa = await limitador.obter_proxima_tentativa(ip_user)
                raise HTTPException(
                    status_code=429,
                    detail={
                        "tentativas": tentativas,
                        "proxima_tentativa": proxima_tentativa.isoformat() if proxima_tentativa else None,
                        "mensagem": "Você excedeu o limite de tentativas. Tente novamente no horário indicado."
                    }
                )
            raise HTTPException(
                status_code=401,
                detail={"tentativas": tentativas, "mensagem": "Email ou senha inválidos"}
            )
        raise HTTPException(status_code=401, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao fazer login: {str(e)}")


@router.post(
    "/refresh",
    response_model=RefreshTokenResponseDTO,
    status_code=200,
    summary="Renovar Token de Acesso",
    description="Usa o refresh token para obter um novo access token sem fazer login novamente"
)
async def refresh_token(
    refresh_data: RefreshTokenDTO,
    token_service = Depends(get_token_service)
):
    try:
        use_case = RefreshTokenUseCase(token_service)
        return use_case.execute(refresh_data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao renovar token: {str(e)}")


@router.get(
    "/me",
    response_model=SupervisorResponseDTO,
    status_code=200,
    summary="Obter dados do supervisor logado",
    description="Retorna os dados do supervisor logado com base no token JWT"
)
async def get_logged_supervisor(
    payload: Annotated[dict, Depends(verify_supervisor_role)],
    repository = Depends(get_repository),
):
    try:
        user_id_raw = payload.get("sub")
        if not user_id_raw:
            raise HTTPException(status_code=401, detail="Token inválido")

        user_id = int(str(user_id_raw))
        supervisor = await asyncio.to_thread(repository.find_by_id, user_id)
        if not supervisor:
            raise HTTPException(status_code=404, detail="Supervisor não encontrado")
        return SupervisorResponseDTO(
            id=supervisor.id,
            nome=supervisor.nome,
            identificador_profissional=supervisor.identificador_profissional,
            uf=supervisor.uf,
            cidade=supervisor.cidade,
            email=supervisor.email,
            telefone=supervisor.telefone,
            empresa=supervisor.empresa
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter dados do supervisor logado: {str(e)}")
