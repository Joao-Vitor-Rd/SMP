import re
import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_02
def test_links_visiveis_tela_login(page):
    login_page = LoginPage(page)

    login_page.acessar()

    expect(login_page.link_esqueci_senha).to_have_attribute("href", "/recuperar-senha")    
    expect(login_page.link_cadastro).to_have_attribute("href", "/cadastro")

    login_page.link_esqueci_senha.click()
    expect(page).to_have_url(re.compile(rf"^{BASE_URL}/recuperar-senha#?$")) 

    login_page.acessar()
    login_page.acessar_cadastro()   
    expect(page).to_have_url(f"{BASE_URL}/cadastro")