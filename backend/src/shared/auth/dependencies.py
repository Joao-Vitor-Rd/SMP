from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.shared.auth.jwt_service import JWTService
from jose import JWTError

security = HTTPBearer()

def get_jwt_service():
    return JWTService()


async def verify_supervisor_role(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)]
) -> dict:
    token = credentials.credentials
    
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
