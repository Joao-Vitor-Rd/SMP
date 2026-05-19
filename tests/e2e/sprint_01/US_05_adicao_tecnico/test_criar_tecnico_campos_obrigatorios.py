import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.tecnico_page import TecnicoPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_05
def test_criar_tecnico_campos_obrigatorios(page, usuario_teste):
    login_page = LoginPage(page)
    tecnico_page = TecnicoPage(page)
    email, senha = usuario_teste

    login_page.acessar()
    login_page.login(email, senha)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)

    tecnico_page.selecionar_tecnico()
    tecnico_page.adicionar_tecnico()

    expect(tecnico_page.mensagem_feedback("Campos obrigatórios", exact=True)).to_be_visible()
    expect(
        tecnico_page.mensagem_feedback("Preencha os campos obrigatórios do acesso.")
    ).to_be_visible()
    expect(page).to_have_url(f"{BASE_URL}/editar-perfil")
