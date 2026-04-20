from fastapi import APIRouter, Depends, HTTPException
from src.shared.auth.dtos import RefreshTokenDTO, RefreshTokenResponseDTO
from src.shared.auth.jwt_service import JWTService

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def get_jwt_service():
    return JWTService()


@router.post(
    "/refresh",
    response_model=RefreshTokenResponseDTO,
    status_code=200,
    summary="Renovar Token de Acesso",
    description="Usa o refresh token para obter um novo access token sem fazer login novamente"
)
async def refresh_token(
    refresh_data: RefreshTokenDTO,
    jwt_service = Depends(get_jwt_service)
):
    
    try:
        new_access_token = jwt_service.refresh_access_token(refresh_data.token_atualizacao)
        return RefreshTokenResponseDTO(
            token_acesso=new_access_token,
            tipo_token="bearer"
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao renovar token: {str(e)}")
