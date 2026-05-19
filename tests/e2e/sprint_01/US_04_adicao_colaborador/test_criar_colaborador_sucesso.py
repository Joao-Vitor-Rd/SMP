import pytest
from datetime import date, timedelta
from uuid import uuid4
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.equipe_page import EquipePage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_04
def test_criar_colaborador_sucesso(page, usuario_teste):
    login_page = LoginPage(page)
    equipe_page = EquipePage(page)
    email_supervisor, senha_supervisor = usuario_teste
    email_colaborador = f"colaborador.{uuid4().hex[:8]}@email.com"
    data_expiracao = (date.today() + timedelta(days=30)).isoformat()

    login_page.acessar()
    login_page.login(email_supervisor, senha_supervisor)

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)

    equipe_page.selecionar_colaborador()
    equipe_page.preencher_colaborador(
        nome="Maria Colaboradora",
        email=email_colaborador,
        data_expiracao=data_expiracao,
    )

    with page.expect_response(
        lambda response: response.url.endswith("/api/colaboradores/")
        and response.request.method == "POST"
        and response.status == 201
    ) as response_info:
        equipe_page.adicionar_colaborador()

    resposta = response_info.value
    assert resposta.status == 201

    colaborador = resposta.json()
    assert colaborador["nome"] == "Maria Colaboradora"
    assert colaborador["email"] == email_colaborador
    assert colaborador["status"] == "Ativo"

    expect(equipe_page.mensagem_feedback("Cadastro concluído")).to_be_visible()
    expect(
        equipe_page.mensagem_feedback("Cadastro realizado e e-mail enviado com sucesso.")
    ).to_be_visible()
