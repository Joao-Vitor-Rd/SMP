import requests
import pytest
import sys
from uuid import uuid4
from pathlib import Path
from playwright.sync_api import sync_playwright

TESTS_DIR = Path(__file__).resolve().parents[1]
if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))

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


def criar_usuario_teste():
    """Cria um supervisor único para testes que precisam de login."""
    email = f"login.teste.{uuid4().hex[:8]}@email.com"
    senha = "Senha@123"

    response = requests.post(f"{BASE_URL}/api/supervisores/", json={
        "nome": "Usuario Login",
        "identificador_profissional": f"MG-{uuid4().hex[:6]}",
        "cidade": "Belo Horizonte",
        "uf": "MG",
        "email": email,
        "senha": senha,
    })
    response.raise_for_status()

    return email, senha


@pytest.fixture(scope="function") # roda antes de cada teste
def usuario_teste():
    """Entrega email e senha de um supervisor novo para o teste."""
    return criar_usuario_teste()


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
