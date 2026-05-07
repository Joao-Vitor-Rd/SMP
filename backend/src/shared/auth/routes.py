from fastapi import APIRouter, Depends, HTTPException, Request, Response
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
    request: Request,
    response: Response,
    jwt_service = Depends(get_jwt_service)
):
    
    try:
        # Tentar ler refresh token do cookie primeiro (melhor prática para HttpOnly)
        refresh_token_cookie = request.cookies.get("refresh_token")
        
        if not refresh_token_cookie:
            # Se não encontrar no cookie, aceitar do body como fallback
            try:
                # Tentar ler como JSON
                refresh_data = await request.json()
                refresh_token_value = refresh_data.get("token_atualizacao")
            except:
                refresh_token_value = None
        else:
            refresh_token_value = refresh_token_cookie
        
        if not refresh_token_value:
            raise ValueError("Token de atualização não encontrado")
        
        # Gerar novo access token
        new_access_token = jwt_service.refresh_access_token(refresh_token_value)
        
        # Adicionar novo access token em HttpOnly cookie
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            # secure=True,  # Apenas HTTPS (descomente em produção)
            samesite="lax",
            max_age=900  # 15 minutos
        )
        
        # Retornar resposta com token para compatibilidade com cliente
        return RefreshTokenResponseDTO(
            token_acesso=new_access_token,
            tipo_token="bearer"
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao renovar token: {str(e)}")
