import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.perfil_page import PerfilPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_02
@pytest.mark.us_08
def test_email_numero_registro_readonly(page, tecnico_primeiro_login):
    login_page = LoginPage(page)
    perfil_page = PerfilPage(page)

    login_page.acessar()
    login_page.login(
        tecnico_primeiro_login["email"],
        tecnico_primeiro_login["senha"],
    )

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    expect(perfil_page.campo_email).to_have_attribute("readonly", "")
    expect(perfil_page.campo_cpf_cft).to_have_attribute("readonly", "")

