from unittest.mock import Mock
import pytest
from src.modules.auth.application.use_cases.reset_password_use_case import ResetPasswordUseCase
from src.modules.auth.application.dtos.password_reset_dto import PasswordResetConfirmDTO

@pytest.mark.unit
class TestResetPasswordUseCase:

    def test_deve_rejeitar_se_senha_for_igual_a_cadastrada(self):
        # Arrange
        user_repository = Mock()
        token_repository = Mock()
        hasher = Mock()

        # Mock active token
        mock_token = Mock()
        mock_token.id = 1
        mock_token.user_id = 10
        token_repository.find_active_by_hash.return_value = mock_token

        # Mock user & profile
        mock_user = Mock()
        mock_user.email = "test@example.com"
        user_repository.find_by_id.return_value = mock_user
        
        user_repository.find_by_email.return_value = {
            "password": "hashed_old_password"
        }

        # Mock hasher to return True when verifying the old password (same password input)
        hasher.verify.return_value = True

        use_case = ResetPasswordUseCase(
            user_repository=user_repository,
            token_repository=token_repository,
            hasher=hasher
        )

        confirm_data = PasswordResetConfirmDTO(
            token="valid_token",
            nova_senha="NewPassword123"  # Must satisfy regex: >=8 chars, lower, upper, digit
        )

        # Act & Assert
        with pytest.raises(ValueError, match="A nova senha não pode ser a mesma já cadastrada"):
            use_case.execute(confirm_data)

        hasher.verify.assert_called_once_with("NewPassword123", "hashed_old_password")
        token_repository.mark_as_used.assert_not_called()
        user_repository.update_password_by_user_id.assert_not_called()

    def test_deve_permitir_se_senha_for_diferente_da_cadastrada(self):
        # Arrange
        user_repository = Mock()
        token_repository = Mock()
        hasher = Mock()

        # Mock active token
        mock_token = Mock()
        mock_token.id = 1
        mock_token.user_id = 10
        token_repository.find_active_by_hash.return_value = mock_token

        # Mock user & profile
        mock_user = Mock()
        mock_user.email = "test@example.com"
        user_repository.find_by_id.return_value = mock_user
        
        user_repository.find_by_email.return_value = {
            "password": "hashed_old_password"
        }

        # Mock hasher: verify returns False (different password), hash returns new hash
        hasher.verify.return_value = False
        hasher.hash.return_value = "hashed_new_password"

        use_case = ResetPasswordUseCase(
            user_repository=user_repository,
            token_repository=token_repository,
            hasher=hasher
        )

        confirm_data = PasswordResetConfirmDTO(
            token="valid_token",
            nova_senha="NewPassword123"
        )

        # Act
        response = use_case.execute(confirm_data)

        # Assert
        assert response.mensagem == "Senha redefinida com sucesso"
        hasher.verify.assert_called_once_with("NewPassword123", "hashed_old_password")
        hasher.hash.assert_called_once_with("NewPassword123")
        user_repository.update_password_by_user_id.assert_called_once_with(10, "hashed_new_password")
        token_repository.mark_as_used.assert_called_once_with(1)
