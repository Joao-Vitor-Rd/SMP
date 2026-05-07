import requests
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"


class AuthManager:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None

    def login(self, email, password):
        """Faz login e guarda os tokens"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "senha": password,
            "lembrar_me": True  # refresh token dura 30 dias
        })
        data = response.json()
        self.access_token = data["token_acesso"]
        self.refresh_token = data["token_atualizacao"]

    def refresh_access_token(self):
        """Renovar token quando expirar"""
        response = requests.post(f"{BASE_URL}/auth/refresh", json={
            "token_atualizacao": self.refresh_token
        })
        data = response.json()
        self.access_token = data["token_acesso"]
        return self.access_token


auth_manager = AuthManager()


@pytest.fixture(scope="session")
def login_once():
    """Só roda quando o teste pedir explicitamente — NÃO é autouse"""
    auth_manager.login("ad1@teste.com", "senha123")
    yield


@pytest.fixture(scope="function")
def page(browser):
    """Cada teste pega uma página nova com token válido"""
    page = browser.new_page()

    page.goto(BASE_URL)

    # Injeta os tokens no localStorage se já estiver logado
    if auth_manager.access_token:
        page.evaluate(f"""
            localStorage.setItem('access_token', '{auth_manager.access_token}');
            localStorage.setItem('refresh_token', '{auth_manager.refresh_token}');
        """)

    # Renova token automaticamente se receber 401
    page.add_init_script("""
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            let response = await originalFetch(...args);

            if (response.status === 401) {
                const refreshToken = localStorage.getItem('refresh_token');
                const refreshResponse = await originalFetch('/auth/refresh', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ token_atualizacao: refreshToken })
                });
                const data = await refreshResponse.json();
                localStorage.setItem('access_token', data.token_acesso);

                return originalFetch(...args);
            }

            return response;
        };
    """)

    yield page
    page.close()