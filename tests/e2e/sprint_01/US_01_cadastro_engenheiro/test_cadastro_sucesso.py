import pytest
from uuid import uuid4
from playwright.sync_api import expect
from e2e.pages.cadastro_page import CadastroPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_01
def test_cadastro_sucesso(page):
    """US-01: Usuário consegue se cadastrar com dados válidos e é redirecionado pro login"""
    cadastro_page = CadastroPage(page)

    cadastro_page.acessar()

    email = f"cauan.teste.{uuid4().hex[:8]}@email.com"
    crea = f"MG-{uuid4().hex[:6]}"

    cadastro_page.preencher_formulario(
        nome="Cauan Teste",
        crea=crea,
        cidade="Belo Horizonte",
        uf="MG",
        email=email,
        senha="Senha@123",
    )

    expect(cadastro_page.uf).to_have_value("MG")

    cadastro_page.enviar()

    expect(page).to_have_url(f"{BASE_URL}/login")
