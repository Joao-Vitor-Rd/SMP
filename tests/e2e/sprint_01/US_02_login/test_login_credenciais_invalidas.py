import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_02
def test_login_credenciais_invalidas(page, usuario_teste, limpar_tentativas_login):
    login_page = LoginPage(page)
    email, _ = usuario_teste

    login_page.acessar()
    login_page.login(email, "SenhaErrada@123")

    expect(login_page.mensagem_erro("Credenciais inválidas. Verifique seu e-mail e senha.") ).to_be_visible()
    expect(page).to_have_url(f"{BASE_URL}/login")
