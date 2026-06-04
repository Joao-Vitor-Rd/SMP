import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.perfil_page import PerfilPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_02
@pytest.mark.us_08
def test_editar_perfil_sucesso(page, colaborador_primeiro_login):
    login_page = LoginPage(page)
    perfil_page = PerfilPage(page)
    novo_nome = "Colaborador Atualizado"

    login_page.acessar()
    login_page.login(
        colaborador_primeiro_login["email"],
        colaborador_primeiro_login["senha"],
    )

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    perfil_page.preencher_dados_editaveis(
        nome=novo_nome,
        empresa="DNIT",
        telefone="31997814542",
        uf="MG",
        cidade="Belo Horizonte",
    )

    with page.expect_response(
        lambda response: "/api/colaboradores/me" in response.url
        and response.request.method == "PUT"
        and 200 <= response.status < 300
    ):
        perfil_page.salvar()

    expect(perfil_page.mensagem_feedback("Alterações salvas")).to_be_visible()
    expect(perfil_page.mensagem_feedback("Perfil atualizado com sucesso.")).to_be_visible()
    expect(perfil_page.nome_no_cabecalho(novo_nome)).to_be_visible()

