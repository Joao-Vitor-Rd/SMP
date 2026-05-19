import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_02
def test_login_sucesso(page, usuario_teste):
    login_page = LoginPage(page)
    email, senha = usuario_teste

    login_page.acessar()

    login_page.login(email, senha)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil")
