import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_02
def test_login_bloqueio_5_tentativas(page, usuario_teste, limpar_tentativas_login):
    login_page = LoginPage(page)
    email, _ = usuario_teste

    login_page.acessar()

    ultima_resposta = None
    for tentativa in range(1, 6):
        login_page.preencher_credenciais(email, "SenhaErrada@123")

        with page.expect_response(
            lambda response: response.url.endswith("/auth/login")
            and response.request.method == "POST"
        ) as response_info:
            login_page.enviar()

        ultima_resposta = response_info.value

        if tentativa < 5:
            expect(
                login_page.mensagem_erro("Credenciais inválidas. Verifique seu e-mail e senha.")
            ).to_be_visible()

    assert ultima_resposta is not None
    assert ultima_resposta.status == 429

    resposta_json = ultima_resposta.json()
    assert resposta_json["detail"]["tentativas"] == 5
    assert resposta_json["detail"]["mensagem"] == (
        "Você excedeu o limite de tentativas. Tente novamente no horário indicado."
    )
    expect(login_page.mensagem_erro("Erro ao conectar com o servidor. Tente novamente.")).to_be_visible()
    expect(page).to_have_url(f"{BASE_URL}/login")
