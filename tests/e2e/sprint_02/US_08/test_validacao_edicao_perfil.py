import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.perfil_page import PerfilPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_02
@pytest.mark.us_08
def test_validacao_edicao_perfil(page, colaborador_primeiro_login):
    login_page = LoginPage(page)
    perfil_page = PerfilPage(page)

    login_page.acessar()
    login_page.login(
        colaborador_primeiro_login["email"],
        colaborador_primeiro_login["senha"],
    )

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    perfil_page.campo_nome.fill("")
    perfil_page.salvar()

    expect(perfil_page.mensagem_feedback("Campo obrigatório")).to_be_visible()
    expect(perfil_page.mensagem_feedback("O nome completo é obrigatório.")).to_be_visible()
    perfil_page.fechar_mensagem()

    perfil_page.campo_nome.fill(colaborador_primeiro_login["nome"])
    perfil_page.campo_telefone.fill("123")
    perfil_page.salvar()

    expect(perfil_page.mensagem_feedback("Telefone inválido", exact=True)).to_be_visible()
    expect(
        perfil_page.mensagem_feedback(
            "Telefone inválido. Informe um telefone válido no formato (31) 99781-4542."
        )
    ).to_be_visible()
