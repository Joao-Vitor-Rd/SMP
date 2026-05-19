import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.equipe_page import EquipePage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_04
def test_botao_adicionar_colaborador_visivel(page, usuario_teste):
    login_page = LoginPage(page)
    equipe_page = EquipePage(page)
    email, senha = usuario_teste

    login_page.acessar()
    login_page.login(email, senha)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    expect(equipe_page.botao_adicionar_colaborador).to_be_visible()
