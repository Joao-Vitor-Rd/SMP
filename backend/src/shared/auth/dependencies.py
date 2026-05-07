from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.shared.auth.jwt_service import JWTService
from jose import JWTError

security = HTTPBearer(auto_error=False)

def get_jwt_service():
    return JWTService()


def get_token_from_request(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)] = None
) -> str:
    """Extrai token do cookie HttpOnly ou do header Authorization"""
    # Tentar ler do cookie primeiro
    token = request.cookies.get("access_token")
    if token:
        return token
    
    # Se não encontrar no cookie, tentar do header Bearer
    if credentials:
        return credentials.credentials
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token não encontrado",
        headers={"WWW-Authenticate": "Bearer"}
    )


async def verify_supervisor_role(
    token: Annotated[str, Depends(get_token_from_request)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
) -> dict:
    try:
        payload = jwt_service.decode(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("role") != "supervisor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas supervisores podem usar este recurso"
        )
    
    return payload


async def verify_colaborador_role(
    token: Annotated[str, Depends(get_token_from_request)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
) -> dict:
    try:
        payload = jwt_service.decode(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("role") != "colaborador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas colaboradores podem usar este recurso"
        )
    
    return payload


async def verify_any_user(
    token: Annotated[str, Depends(get_token_from_request)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
) -> dict:
    """Valida qualquer usuário autenticado (supervisor ou colaborador)"""
    try:
        payload = jwt_service.decode(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload
