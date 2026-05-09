import pytest
from playwright.sync_api import expect

BASE_URL = "http://localhost:3000"


@pytest.mark.sprint_01
@pytest.mark.us_02
def test_login_sucesso(page, usuario_teste):
    email, senha = usuario_teste

    page.goto(f"{BASE_URL}/login")

    page.locator("input[type='email']").fill(email)
    page.locator("input[type='password']").fill(senha)
    page.get_by_role("button", name="Entrar").click()

    expect(page).to_have_url(f"{BASE_URL}/editar-perfil")
