import pytest
from playwright.sync_api import expect
from e2e.pages.cadastro_page import CadastroPage

BASE_URL = "http://localhost:3000"

@pytest.mark.sprint_01
@pytest.mark.us_01
def test_link_retornar_para_login(page):
    cadastro_page = CadastroPage(page)

    cadastro_page.acessar()

    expect(cadastro_page.link_login).to_be_visible()
    expect(cadastro_page.link_login).to_have_attribute("href", "/login")

    cadastro_page.acessar_login()

    expect(page).to_have_url(f"{BASE_URL}/login")
