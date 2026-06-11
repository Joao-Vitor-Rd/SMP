import re
from hashlib import sha256

from src.modules.auth.application.dtos.password_reset_dto import (
    PasswordResetConfirmDTO,
    PasswordResetMessageDTO,
)
from src.modules.auth.domain.repositories.i_password_reset_token_repository import (
    IPasswordResetTokenRepository,
)
from src.modules.auth.infrastructure.repositories.generic_user_repository import (
    GenericUserRepository,
)
from src.shared.security.password_hash import PassWordHasher


class ResetPasswordUseCase:
    def __init__(
        self,
        user_repository: GenericUserRepository,
        token_repository: IPasswordResetTokenRepository,
        hasher: PassWordHasher,
    ):
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.hasher = hasher

    def _validar_senha(self, senha: str) -> None:
        if len(senha) < 8:
            raise ValueError("Senha deve conter no mínimo 8 caracteres")

        padrao = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
        if not re.match(padrao, senha):
            raise ValueError(
                "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número"
            )

    def execute(self, confirm_data: PasswordResetConfirmDTO) -> PasswordResetMessageDTO:
        token_hash = sha256(confirm_data.token.encode("utf-8")).hexdigest()
        token = self.token_repository.find_active_by_hash(token_hash)

        if not token:
            raise ValueError("Link inválido, expirado ou já utilizado")

        self._validar_senha(confirm_data.nova_senha)

        # Validar se a senha não é igual à já cadastrada
        user = self.user_repository.find_by_id(token.user_id)
        if not user:
            raise ValueError("Usuário não encontrado")

        user_info = self.user_repository.find_by_email(user.email)
        if not user_info:
            raise ValueError("Perfil do usuário não encontrado")

        senha_atual_hash = user_info["password"]
        if self.hasher.verify(confirm_data.nova_senha, senha_atual_hash):
            raise ValueError("A nova senha não pode ser a mesma já cadastrada")

        senha_hash = self.hasher.hash(confirm_data.nova_senha)
        self.user_repository.update_password_by_user_id(token.user_id, senha_hash)
        self.token_repository.mark_as_used(token.id)

        return PasswordResetMessageDTO(mensagem="Senha redefinida com sucesso")