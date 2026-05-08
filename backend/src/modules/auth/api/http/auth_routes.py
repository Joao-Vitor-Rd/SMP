from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
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
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.shared.auth.jwt_service import JWTService
from src.shared.auth.dependencies import verify_supervisor_role
import asyncio
from src.modules.supervisor.application.dtos.supervisor_dto import SupervisorResponseDTO

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def get_repository(session: Annotated[Session, Depends(get_session)]):
    return GenericUserRepository(session)


def get_supervisor_repository(session: Annotated[Session, Depends(get_session)]):
    return SupervisorRepository(session)


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
    description="Realiza login de supervisor ou colaborador com validação de credenciais e retorna tokens JWT em HttpOnly cookies"
)
async def login(
    login_data: LoginDTO,
    request: Request,
    response: Response,
    repository = Depends(get_repository),
    hasher = Depends(get_hasher),
    token_service = Depends(get_token_service),
    limitador = Depends(get_limitador)
):
    try:
        ip_user = get_client_ip(request)
        use_case = LoginUseCase(repository, hasher, token_service, limitador)
        login_response = await use_case.execute(login_data, ip_user)
        
        # Adicionar tokens em HttpOnly cookies
        response.set_cookie(
            key="access_token",
            value=login_response.token_acesso,
            httponly=True,
            # secure=True,  # Apenas HTTPS (descomente em produção)
            samesite="lax",
            max_age=900  # 15 minutos
        )
        response.set_cookie(
            key="refresh_token",
            value=login_response.token_atualizacao,
            httponly=True,
            # secure=True,  # Apenas HTTPS (descomente em produção)
            samesite="lax",
            max_age=2592000 if login_data.lembrar_me else 28800  # 30 dias ou 8 horas
        )
        
        # Retornar resposta sem expor os tokens
        return LoginResponseDTO(
            token_acesso="",  # Vazio pois está no cookie
            token_atualizacao="",  # Vazio pois está no cookie
            tipo_token="bearer",
            usuario=login_response.usuario
        )
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
    request: Request,
    response: Response,
    token_service = Depends(get_token_service)
):
    try:
        # Ler refresh token do cookie
        refresh_token_cookie = request.cookies.get("refresh_token")
        if not refresh_token_cookie:
            raise ValueError("Token de atualização não encontrado")
        
        refresh_data = RefreshTokenDTO(token_atualizacao=refresh_token_cookie)
        use_case = RefreshTokenUseCase(token_service)
        result = use_case.execute(refresh_data)
        
        # Adicionar novo access token em HttpOnly cookie
        response.set_cookie(
            key="access_token",
            value=result.token_acesso,
            httponly=True,
            # secure=True,  # Apenas HTTPS (descomente em produção)
            samesite="lax",
            max_age=900  # 15 minutos
        )
        
        # Retornar resposta sem expor o token
        return RefreshTokenResponseDTO(
            token_acesso="",  # Vazio pois está no cookie
            tipo_token="bearer"
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao renovar token: {str(e)}")


@router.post(
    "/logout",
    status_code=204,
    summary="Fazer Logout",
    description="Limpa os tokens armazenados em HttpOnly cookies"
)
async def logout(response: Response):
    """Remove os tokens dos cookies"""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        # secure=True,  # Apenas HTTPS (descomente em produção)
        samesite="lax"
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        # secure=True,  # Apenas HTTPS (descomente em produção)
        samesite="lax"
    )
    return None


@router.get(
    "/me",
    response_model=SupervisorResponseDTO,
    status_code=200,
    summary="Obter dados do supervisor logado",
    description="Retorna os dados do supervisor logado com base no token JWT"
)
async def get_logged_supervisor(
    payload: Annotated[dict, Depends(verify_supervisor_role)],
    repository = Depends(get_supervisor_repository),
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
            nome=supervisor.name,
            identificador_profissional=supervisor.idendificador_profissional,
            uf=supervisor.uf,
            cidade=supervisor.cidade,
            email=supervisor.email,
            telefone=supervisor.telefone,
            empresa=supervisor.empresa_ou_orgao
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter dados do supervisor logado: {str(e)}")
