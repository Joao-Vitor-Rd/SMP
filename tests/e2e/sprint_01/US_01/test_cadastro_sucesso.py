import pytest
from playwright.sync_api import expect

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_01
def test_cadastro_sucesso(page):
    """US-01: Usuário consegue se cadastrar com dados válidos e é redirecionado pro login"""

    # 1. Navega pra página de cadastro
    page.goto(f"{BASE_URL}/cadastro")

    # 2. Preenche os campos (baseado no seu HTML)
    page.locator("input[id='nome']").fill("João Teste")
    page.locator("input[id='crea']").fill("SP-123456")
    page.locator("select[id='uf']").select_option("SP")
    page.locator("input[id='email']").fill("joao.teste@email.com")
    page.locator("input[id='senha']").fill("Senha@123")
    page.locator("input[id='confirmarSenha']").fill("Senha@123")

    # 3. Clica no botão de cadastro
    page.locator("button[type='submit']").click()

    # 4. Verifica redirecionamento pra tela de login
    expect(page).to_have_url(f"{BASE_URL}/login")