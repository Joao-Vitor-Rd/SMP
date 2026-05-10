import pytest
from playwright.sync_api import expect
from e2e.pages.cadastro_page import CadastroPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_01
def test_bloquear_campos_obrigatorios_vazios(page):
    cadastro_page = CadastroPage(page)

    cadastro_page.acessar()
    cadastro_page.enviar()

    campos_obrigatorios = [
        cadastro_page.nome,
        cadastro_page.crea,
        cadastro_page.cidade,
        cadastro_page.uf,
        cadastro_page.email,
        cadastro_page.senha,
        cadastro_page.confirmar_senha,
    ]

    for campo in campos_obrigatorios:
        assert campo.evaluate("element => element.validity.valueMissing")

    expect(page).to_have_url(f"{BASE_URL}/cadastro")