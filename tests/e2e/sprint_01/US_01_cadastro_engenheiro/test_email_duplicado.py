import pytest
from uuid import uuid4
from playwright.sync_api import expect
import time

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_01
def test_exibir_erro_email_duplicado(page, usuario_teste):
    email_existente, _ = usuario_teste
    crea = f"MG-{uuid4().hex[:6]}"

    page.goto(f"{BASE_URL}/cadastro")

    # campos html
    page.locator("input#nome").fill("Cauan Teste")
    page.locator("input#crea").fill(crea)
    page.locator("#cidade").fill("Belo Horizonte")

    page.locator("select#uf").select_option("MG")
    expect(page.locator("select#uf")).to_have_value("MG")

    page.locator("input#email").fill(email_existente)
    page.locator("input#senha").fill("Senha@123")
    page.locator("input#confirmarSenha").fill("Senha@123")

   
    page.get_by_role("button", name="Concluir Cadastro").click()

    # verifica redirecionamento pra tela de login

    expect(page.get_by_text("Emial ja cadastrado no sistema")).to_be_visible
    expect(page).to_have_url(f"{BASE_URL}/cadastro")
