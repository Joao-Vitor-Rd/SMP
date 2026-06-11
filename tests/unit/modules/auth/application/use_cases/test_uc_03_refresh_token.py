"""Testes unitários do UC-03: renovação de token de acesso.

O use case deve apenas repassar o refresh token ao serviço de tokens, retornar
um novo token de acesso e transformar falhas de infraestrutura em erro de
negócio previsível.
"""

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
class TestRefreshTokenUseCase:
    """Cenários principais de renovação de sessão."""

    def test_deve_renovar_token_de_acesso_com_sucesso(
        self,
        refresh_token_use_case,
        token_service,
        make_refresh_token_dto,
    ):
        response = refresh_token_use_case.execute(make_refresh_token_dto())

        token_service.refresh_access_token.assert_called_once_with("refresh-token")
        assert response.token_acesso == "new-access-token"
        assert response.tipo_token == "bearer"

    def test_deve_converter_falha_do_servico_em_value_error(
        self,
        refresh_token_use_case,
        token_service,
        make_refresh_token_dto,
    ):
        token_service.refresh_access_token.side_effect = RuntimeError("expired")

        with pytest.raises(ValueError, match="Erro ao renovar token: expired"):
            refresh_token_use_case.execute(make_refresh_token_dto())