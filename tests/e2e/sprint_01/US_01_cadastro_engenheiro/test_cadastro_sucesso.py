import pytest
from uuid import uuid4
from playwright.sync_api import expect
import time

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_01
def test_cadastro_sucesso(page):
    """US-01: Usuário consegue se cadastrar com dados válidos e é redirecionado pro login"""

    # 1. Navega pra página de cadastro
    page.goto(f"{BASE_URL}/cadastro")

    email = f"cauan.teste.{uuid4().hex[:8]}@email.com"
    crea = f"MG-{uuid4().hex[:6]}"

    # campos html
    page.locator("input#nome").fill("Cauan Teste")
    page.locator("input#crea").fill(crea)
    page.locator("#cidade").fill("Belo Horizonte")

    page.locator("select#uf").select_option("MG")
    expect(page.locator("select#uf")).to_have_value("MG")

    page.locator("input#email").fill(email)
    page.locator("input#senha").fill("Senha@123")
    page.locator("input#confirmarSenha").fill("Senha@123")

    # clicar no botao de cadastro
    page.get_by_role("button", name="Concluir Cadastro").click()

    # verifica redirecionamento pra tela de login
    expect(page).to_have_url(f"{BASE_URL}/login")
