import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.equipe_page import EquipePage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_04
def test_criar_colaborador_campos_obrigatorios(page, usuario_teste):
    login_page = LoginPage(page)
    equipe_page = EquipePage(page)
    email, senha = usuario_teste

    login_page.acessar()
    login_page.login(email, senha)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)

    equipe_page.selecionar_colaborador()
    equipe_page.adicionar_colaborador()

    expect(equipe_page.mensagem_feedback("Campos obrigatórios", exact=True)).to_be_visible()
    expect(
        equipe_page.mensagem_feedback("Preencha os campos obrigatórios do acesso.")
    ).to_be_visible()
    expect(page).to_have_url(f"{BASE_URL}/editar-perfil")
