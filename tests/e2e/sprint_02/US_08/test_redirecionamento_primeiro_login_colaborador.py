import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.perfil_page import PerfilPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_02
@pytest.mark.us_08
def test_redirecionamento_primeiro_login_colaborador(page, colaborador_primeiro_login):
    login_page = LoginPage(page)
    perfil_page = PerfilPage(page)

    login_page.acessar()
    login_page.login(
        colaborador_primeiro_login["email"],
        colaborador_primeiro_login["senha"],
    )

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    perfil_page.botao_historico.click()
    expect(page).to_have_url(f"{BASE_URL}/editar-perfil")

