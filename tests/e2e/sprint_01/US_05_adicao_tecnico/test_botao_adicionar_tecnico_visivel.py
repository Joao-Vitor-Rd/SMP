import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.tecnico_page import TecnicoPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_05
def test_botao_adicionar_tecnico_visivel(page, usuario_teste):
    login_page = LoginPage(page)
    tecnico_page = TecnicoPage(page)
    email, senha = usuario_teste

    login_page.acessar()
    login_page.login(email, senha)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    expect(tecnico_page.botao_tipo_tecnico).to_be_visible()
    expect(tecnico_page.botao_adicionar_tecnico).to_be_visible()
