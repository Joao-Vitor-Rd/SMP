import pytest
from playwright.sync_api import expect
from e2e.pages.login_page import LoginPage

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_02
def test_login_campos_vazios(page):
    login_page = LoginPage(page)

    login_page.acessar()
    login_page.enviar()

    assert login_page.email.evaluate("element => element.validity.valueMissing")
    assert login_page.senha.evaluate("element => element.validity.valueMissing")
    expect(page).to_have_url(f"{BASE_URL}/login")
