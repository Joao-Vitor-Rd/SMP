from src.modules.auth.application.dtos.login_dto import RefreshTokenDTO, RefreshTokenResponseDTO
from src.shared.security.token_service import TokenService


class RefreshTokenUseCase:
    def __init__(self, token_service: TokenService):
        self.token_service = token_service

    def execute(self, refresh_data: RefreshTokenDTO) -> RefreshTokenResponseDTO:
        try:
            new_access_token = self.token_service.refresh_access_token(refresh_data.token_atualizacao)
            
            return RefreshTokenResponseDTO(
                token_acesso=new_access_token,
                tipo_token="bearer"
            )
        except Exception as e:
            raise ValueError(f"Erro ao renovar token: {str(e)}")
