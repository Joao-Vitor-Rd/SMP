"""Testes unitários do UC-02: autenticação de usuário.

Este módulo cobre o contrato de backend de `LoginUseCase`: validação de
credenciais, controle de tentativas, bloqueio, reset após sucesso, geração de
tokens e repasse da opção `lembrar_me` ao serviço de token. Regras visuais da
US-02, como redirecionamento para a aba "Histórico" e links visíveis na tela,
devem permanecer em testes e2e ou de frontend, pois não pertencem ao use case
de aplicação.
"""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest


def run(coro):
    return asyncio.run(coro)


@pytest.mark.unit
@pytest.mark.sprint_01
@pytest.mark.us_02
class TestLoginUseCase:
    """Cenários principais de autenticação e controle de sessão."""

    @pytest.mark.parametrize("lembrar_me", [False, True])
    def test_deve_autenticar_usuario_e_gerar_tokens_respeitando_lembrar_me(
        self,
        login_use_case,
        auth_repository,
        auth_hasher,
        token_service,
        limitador_tentativas,
        make_user_info,
        make_login_dto,
        lembrar_me,
    ):
        auth_repository.find_by_email.return_value = make_user_info()

        response = run(
            login_use_case.execute(
                make_login_dto(lembrar_me=lembrar_me),
                ip_user="127.0.0.1",
            )
        )

        auth_repository.find_by_email.assert_called_once_with(
            "maria.clara@example.com"
        )
        auth_hasher.verify.assert_called_once_with("Senha123", "senha-hash")
        limitador_tentativas.resetar.assert_awaited_once_with("127.0.0.1")
        token_service.generate.assert_called_once_with(
            make_user_info()["user"],
            "supervisor",
            lembrar_me,
        )
        token_service.generate_refresh_token.assert_called_once_with(
            make_user_info()["user"],
            "supervisor",
            lembrar_me,
        )
        assert response.token_acesso == "access-token"
        assert response.token_atualizacao == "refresh-token"
        assert response.tipo_token == "bearer"
        assert response.usuario["id"] == 1
        assert response.usuario["nome"] == "Maria Clara"
        assert response.usuario["cargo"] == "supervisor"
        assert response.usuario["crea"] == "CREA-12345"

    @pytest.mark.parametrize(
        ("user_info", "senha_valida"),
        [
            (None, True),
            ("usuario_existente", False),
        ],
    )
    def test_deve_tratar_email_inexistente_e_senha_incorreta_de_forma_equivalente(
        self,
        login_use_case,
        auth_repository,
        auth_hasher,
        limitador_tentativas,
        make_user_info,
        make_login_dto,
        user_info,
        senha_valida,
    ):
        auth_repository.find_by_email.return_value = (
            make_user_info() if user_info else None
        )
        auth_hasher.verify.return_value = senha_valida
        limitador_tentativas.registrar_tentativa.return_value = 2

        with pytest.raises(ValueError, match="2"):
            run(login_use_case.execute(make_login_dto(), ip_user="127.0.0.1"))

        limitador_tentativas.registrar_tentativa.assert_awaited_once_with("127.0.0.1")
        limitador_tentativas.resetar.assert_not_called()

    def test_deve_bloquear_login_quando_ip_ja_excedeu_limite_de_tentativas(
        self,
        login_use_case,
        auth_repository,
        limitador_tentativas,
        make_login_dto,
    ):
        limitador_tentativas.esta_bloqueado.return_value = True
        limitador_tentativas.obter_tentativas.return_value = 5

        with pytest.raises(ValueError, match="5"):
            run(login_use_case.execute(make_login_dto(), ip_user="127.0.0.1"))

        limitador_tentativas.obter_tentativas.assert_awaited_once_with("127.0.0.1")
        auth_repository.find_by_email.assert_not_called()

    @pytest.mark.parametrize(
        ("acesso_liberado", "limite_acesso"),
        [
            (False, None),
            (True, datetime.now(timezone.utc) - timedelta(minutes=1)),
        ],
    )
    def test_deve_rejeitar_colaborador_sem_acesso_liberado_ou_com_acesso_expirado(
        self,
        login_use_case,
        auth_repository,
        token_service,
        make_user_info,
        make_login_dto,
        usuario_colaborador,
        acesso_liberado,
        limite_acesso,
    ):
        auth_repository.find_by_email.return_value = make_user_info(
            user=usuario_colaborador,
            user_type="colaborador",
            cargo="colaborador",
            nome="Ana Clara",
            cft="123456",
            identificador_profissional=None,
            acesso_liberado=acesso_liberado,
            limite_acesso=limite_acesso,
        )

        with pytest.raises(
            ValueError,
            match="Você não possui mais acesso ao sistema, entre em contato com seu supervisor",
        ):
            run(
                login_use_case.execute(
                    make_login_dto(email="ana.clara@example.com"),
                    ip_user="127.0.0.1",
                )
            )

        token_service.generate.assert_not_called()
        token_service.generate_refresh_token.assert_not_called()

    def test_deve_autenticar_colaborador_com_acesso_valido(
        self,
        login_use_case,
        auth_repository,
        auth_hasher,
        token_service,
        limitador_tentativas,
        make_user_info,
        make_login_dto,
        usuario_colaborador,
    ):
        auth_repository.find_by_email.return_value = make_user_info(
            user=usuario_colaborador,
            user_type="colaborador",
            cargo="colaborador",
            nome="Ana Clara",
            cft="123456",
            identificador_profissional=None,
            acesso_liberado=True,
            limite_acesso=datetime.now(timezone.utc) + timedelta(days=1),
        )

        response = run(
            login_use_case.execute(
                make_login_dto(email="ana.clara@example.com"),
                ip_user="127.0.0.1",
            )
        )

        auth_hasher.verify.assert_called_once_with("Senha123", "senha-hash")
        limitador_tentativas.resetar.assert_awaited_once_with("127.0.0.1")
        token_service.generate.assert_called_once_with(
            usuario_colaborador,
            "colaborador",
            False,
        )
        token_service.generate_refresh_token.assert_called_once_with(
            usuario_colaborador,
            "colaborador",
            False,
        )
        assert response.usuario["cargo"] == "colaborador"
        assert response.usuario["cft"] == "123456"
