import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage
from e2e.pages.perfil_page import PerfilPage

BASE_URL = "http://localhost:3000"


def formatar_cpf_cft(valor):
    digitos = "".join(caractere for caractere in valor if caractere.isdigit())
    return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:11]}"


@pytest.mark.sprint_02
@pytest.mark.us_08
def test_dados_atuais_pre_preenchidos(page, tecnico_primeiro_login):
    login_page = LoginPage(page)
    perfil_page = PerfilPage(page)

    login_page.acessar()
    login_page.login(
        tecnico_primeiro_login["email"],
        tecnico_primeiro_login["senha"],
    )

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil", timeout=7000)
    expect(perfil_page.campo_nome).to_have_value(tecnico_primeiro_login["nome"])
    expect(perfil_page.campo_email).to_have_value(tecnico_primeiro_login["email"])
    expect(perfil_page.campo_cpf_cft).to_have_value(
        formatar_cpf_cft(tecnico_primeiro_login["cft"])
    )
