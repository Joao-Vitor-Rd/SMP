from datetime import datetime, timedelta
from hashlib import sha256
import secrets

from src.modules.auth.application.dtos.password_reset_dto import (
    PasswordResetMessageDTO,
    PasswordResetRequestDTO,
)
from src.modules.auth.domain.repositories.i_password_reset_token_repository import (
    IPasswordResetTokenRepository,
)
from src.modules.auth.infrastructure.repositories.generic_user_repository import (
    GenericUserRepository,
)
from src.modules.auth.infrastructure.services.password_reset_email_service import (
    PasswordResetEmailService,
)


class RequestPasswordResetUseCase:
    def __init__(
        self,
        user_repository: GenericUserRepository,
        token_repository: IPasswordResetTokenRepository,
        email_service: PasswordResetEmailService,
        app_url: str,
    ):
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.email_service = email_service
        self.app_url = app_url.rstrip("/")

    def execute(self, request_data: PasswordResetRequestDTO) -> PasswordResetMessageDTO:
        email_normalizado = request_data.email.strip().lower()
        user_info = self.user_repository.find_by_email(email_normalizado)

        if user_info:
            user = user_info["user"]
            nome = user_info["nome"]
            raw_token = secrets.token_urlsafe(32)
            token_hash = sha256(raw_token.encode("utf-8")).hexdigest()
            expires_at = datetime.utcnow() + timedelta(hours=2)
            link_redefinicao = f"{self.app_url}/trocar-senha?token={raw_token}"
            self.token_repository.deactivate_active_tokens_for_user(user.id)
            self.token_repository.create_token(user.id, token_hash, expires_at)
            self.email_service.enviar_link_redefinicao(nome, email_normalizado, link_redefinicao)

        return PasswordResetMessageDTO(
            mensagem="Se o e-mail estiver cadastrado, um link de redefinição será enviado."
        )