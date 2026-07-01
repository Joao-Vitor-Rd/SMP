from typing import Annotated, Union
import asyncio
import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from src.shared.infrastructure.db import get_session
from src.shared.infrastructure.redis_config import RedisClient
from src.modules.auth.application.dtos.login_dto import LoginDTO, LoginResponseDTO, RefreshTokenDTO, RefreshTokenResponseDTO
from src.modules.auth.application.dtos.password_reset_dto import PasswordResetConfirmDTO, PasswordResetMessageDTO, PasswordResetRequestDTO
from src.modules.auth.application.use_cases.login_use_case import LoginUseCase, AcessoColaboradorExpiradoError
from src.modules.auth.application.use_cases.refresh_token_use_case import RefreshTokenUseCase
from src.modules.auth.application.use_cases.request_password_reset_use_case import RequestPasswordResetUseCase
from src.modules.auth.application.use_cases.reset_password_use_case import ResetPasswordUseCase
from src.modules.auth.infrastructure.repositories.generic_user_repository import GenericUserRepository
from src.modules.auth.infrastructure.repositories.password_reset_token_repository import PasswordResetTokenRepository
from src.modules.auth.infrastructure.services.limitador_redis import LimitadorRedis
from src.modules.auth.infrastructure.services.password_reset_email_service import PasswordResetEmailService
from src.modules.supervisor.infrastructure.security.argon2_hasher import Argon2PasswordHasher
from src.modules.supervisor.infrastructure.repositories.SupervisorRepository import SupervisorRepository
from src.modules.colaborador.infrastructure.repositories.ColaboradorRepository import ColaboradorRepository
from src.shared.auth.jwt_service import JWTService
from src.shared.auth.dependencies import verify_supervisor_role, verify_any_user
from src.modules.supervisor.application.dtos.supervisor_dto import SupervisorResponseDTO
from src.modules.colaborador.application.dtos.colaborador_dto import ColaboradorResponseDTO

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def get_repository(session: Annotated[Session, Depends(get_session)]):
    return GenericUserRepository(session)


def get_supervisor_repository(session: Annotated[Session, Depends(get_session)]):
    return SupervisorRepository(session)


def get_colaborador_repository(session: Annotated[Session, Depends(get_session)]):
    return ColaboradorRepository(session)


def get_hasher():
    return Argon2PasswordHasher()


def get_token_service():
    return JWTService()


async def get_limitador():
    """Dependency para obter instância do limitador Redis"""
    redis_client = await RedisClient.get_client()
    return LimitadorRedis(redis_client)


def get_password_reset_token_repository(session: Annotated[Session, Depends(get_session)]):
    return PasswordResetTokenRepository(session)


def get_password_reset_email_service():
    return PasswordResetEmailService()


def get_app_url() -> str:
    return os.getenv("APP_URL", "http://localhost:3000")


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
        
        # Retornar resposta com tokens também no body (fallback Bearer para o SPA)
        return LoginResponseDTO(
            token_acesso=login_response.token_acesso,
            token_atualizacao=login_response.token_atualizacao,
            tipo_token="bearer",
            usuario=login_response.usuario
        )
    except AcessoColaboradorExpiradoError as e:
        raise HTTPException(
            status_code=403,
            detail={"mensagem": str(e), "motivo": "acesso_colaborador_expirado"}
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
        
        # Retornar resposta com token também no body (fallback Bearer para o SPA)
        return RefreshTokenResponseDTO(
            token_acesso=result.token_acesso,
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


@router.post(
    "/password-reset/request",
    response_model=PasswordResetMessageDTO,
    status_code=200,
    summary="Solicitar redefinição de senha",
    description="Envia um link de redefinição para o e-mail informado sem revelar se a conta existe",
)
async def request_password_reset(
    request_data: PasswordResetRequestDTO,
    user_repository = Depends(get_repository),
    token_repository = Depends(get_password_reset_token_repository),
    email_service = Depends(get_password_reset_email_service),
):
    try:
        use_case = RequestPasswordResetUseCase(
            user_repository=user_repository,
            token_repository=token_repository,
            email_service=email_service,
            app_url=get_app_url(),
        )
        return await asyncio.to_thread(use_case.execute, request_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao solicitar redefinição de senha: {str(e)}")


@router.post(
    "/password-reset/confirm",
    response_model=PasswordResetMessageDTO,
    status_code=200,
    summary="Redefinir senha",
    description="Valida o link único de redefinição e atualiza a senha do usuário",
)
async def confirm_password_reset(
    confirm_data: PasswordResetConfirmDTO,
    user_repository = Depends(get_repository),
    token_repository = Depends(get_password_reset_token_repository),
    hasher = Depends(get_hasher),
):
    try:
        use_case = ResetPasswordUseCase(
            user_repository=user_repository,
            token_repository=token_repository,
            hasher=hasher,
        )
        return await asyncio.to_thread(use_case.execute, confirm_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao redefinir senha: {str(e)}")


@router.get(
    "/me",
    response_model=Union[SupervisorResponseDTO, ColaboradorResponseDTO],
    status_code=200,
    summary="Obter dados do usuário logado",
    description="Retorna os dados do usuário logado (supervisor, colaborador ou técnico) com base no token JWT"
)
async def get_logged_user(
    payload: Annotated[dict, Depends(verify_any_user)],
    supervisor_repo = Depends(get_supervisor_repository),
    colaborador_repo = Depends(get_colaborador_repository),
):
    try:
        user_id_raw = payload.get("sub")
        role = payload.get("role")
        
        if not user_id_raw:
            raise HTTPException(status_code=401, detail="Token inválido")

        user_id = int(str(user_id_raw))
        
        # Retornar dados baseado no role
        if role == "supervisor":
            supervisor = await asyncio.to_thread(supervisor_repo.find_by_user_id, user_id)
            if not supervisor:
                raise HTTPException(status_code=404, detail="Supervisor não encontrado")
            return SupervisorResponseDTO(
                id=user_id,
                nome=supervisor.name,
                identificador_profissional=supervisor.idendificador_profissional,
                uf=supervisor.uf,
                cidade=supervisor.cidade,
                email=supervisor.email,
                telefone=supervisor.telefone,
                empresa=supervisor.empresa_ou_orgao
            )
        elif role in ["colaborador", "tecnico"]:
            colaborador = await asyncio.to_thread(colaborador_repo.find_by_user_id, user_id)
            if not colaborador:
                raise HTTPException(status_code=404, detail="Colaborador não encontrado")
            return ColaboradorResponseDTO(
                id=user_id,
                nome=colaborador.nome,
                id_profissional_responsavel=colaborador.id_profissional_responsavel,
                is_tecnico=colaborador.is_tecnico,
                email=colaborador.email,
                cft=colaborador.cft,
                uf=colaborador.uf,
                cidade=colaborador.cidade,
                empresa_ou_orgao=colaborador.empresa_ou_orgao,
                telefone=colaborador.telefone,
                instituicao_ensino=colaborador.instituicao_ensino,
                limite_acesso=colaborador.limite_acesso,
                acesso_liberado=colaborador.acesso_liberado,
                status="Ativo",
            )
        else:
            raise HTTPException(status_code=403, detail="Role não reconhecido")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter dados do usuário: {str(e)}")
