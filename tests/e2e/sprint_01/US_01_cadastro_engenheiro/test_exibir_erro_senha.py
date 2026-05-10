import pytest
from uuid import uuid4
from playwright.sync_api import expect
from e2e.pages.cadastro_page import CadastroPage

BASE_URL = "http://localhost:3000"

@pytest.mark.sprint_01
@pytest.mark.us_01

def test_exibir_erro_senha_fraca(page):

    cadastro_page = CadastroPage(page)

    cadastro_page.acessar()

    crea = f"MG-{uuid4().hex[:6]}"
    email=f"senha.fraca.{uuid4().hex[:8]}@email.com"


    cadastro_page.preencher_formulario(
        nome="cauan ricardo",
        crea=crea,
        cidade="Belo Horizonte",
        uf="MG",
        email=email,
        senha="123",
    )

    cadastro_page.enviar()

    expect(cadastro_page.mensagem_erro("Senha deve conter 8 caracteres")).to_be_visible()
    expect(page).to_have_url(f"{BASE_URL}/cadastro")

