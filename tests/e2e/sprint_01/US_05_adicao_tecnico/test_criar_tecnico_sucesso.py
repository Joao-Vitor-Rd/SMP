import pytest
from uuid import uuid4
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.tecnico_page import TecnicoPage

BASE_URL = "http://localhost:3000"


def cft_unico():
    return str(uuid4().int)[:11]


@pytest.mark.sprint_01
@pytest.mark.us_05
def test_criar_tecnico_sucesso(page, usuario_teste):
    login_page = LoginPage(page)
    tecnico_page = TecnicoPage(page)
    email_supervisor, senha_supervisor = usuario_teste
    email_tecnico = f"tecnico.{uuid4().hex[:8]}@email.com"
    cft = cft_unico()

    login_page.acessar()
    login_page.login(email_supervisor, senha_supervisor)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)

    tecnico_page.selecionar_tecnico()
    tecnico_page.preencher_tecnico(
        nome="Carlos Tecnico",
        email=email_tecnico,
        cft=cft,
    )

    expect(tecnico_page.campo_data_expiracao).not_to_be_visible()

    with page.expect_response(
        lambda response: response.url.endswith("/api/colaboradores/")
        and response.request.method == "POST"
        and response.status == 201
    ) as response_info:
        tecnico_page.adicionar_tecnico()

    resposta = response_info.value
    tecnico = resposta.json()

    assert tecnico["nome"] == "Carlos Tecnico"
    assert tecnico["email"] == email_tecnico
    assert tecnico["is_tecnico"] is True
    assert tecnico["cft"] == cft
    assert tecnico["limite_acesso"] is None
    assert tecnico["status"] == "Ativo"

    expect(tecnico_page.mensagem_feedback("Cadastro concluído")).to_be_visible()
    expect(
        tecnico_page.mensagem_feedback("Cadastro realizado e e-mail enviado com sucesso.")
    ).to_be_visible()
