import pytest
from uuid import uuid4
from playwright.sync_api import expect
from e2e.pages.cadastro_page import CadastroPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_01
def test_exibir_erro_email_duplicado(page, usuario_teste):
    cadastro_page = CadastroPage(page)
    email_existente, _ = usuario_teste
    crea = f"MG-{uuid4().hex[:6]}"

    cadastro_page.acessar()

    cadastro_page.preencher_formulario(
        nome="Cauan Teste",
        crea=crea,
        cidade="Belo Horizonte",
        uf="MG",
        email=email_existente,
        senha="Senha@123",
    )

    expect(cadastro_page.uf).to_have_value("MG")

    cadastro_page.enviar()

    expect(cadastro_page.mensagem_erro("Email já cadastrado no sistema")).to_be_visible()
    expect(page).to_have_url(f"{BASE_URL}/cadastro")
