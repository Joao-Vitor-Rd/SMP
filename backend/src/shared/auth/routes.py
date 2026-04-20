from fastapi import APIRouter, Depends, HTTPException
from src.shared.auth.dtos import RefreshTokenDTO, RefreshTokenResponseDTO
from src.shared.auth.jwt_service import JWTService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_jwt_service():
    return JWTService()


@router.post("/refresh", response_model=RefreshTokenResponseDTO, status_code=200)
async def refresh_token(
    refresh_data: RefreshTokenDTO,
    jwt_service = Depends(get_jwt_service)
):
    
    try:
        new_access_token = jwt_service.refresh_access_token(refresh_data.refresh_token)
        return RefreshTokenResponseDTO(
            access_token=new_access_token,
            token_type="bearer"
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao renovar token: {str(e)}")
