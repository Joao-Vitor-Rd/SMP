import requests
import pytest
import sys
import socket
import os
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


def _ler_resposta_redis(sock):
    return sock.recv(65536)


def _comando_redis(*partes):
    comando = [f"*{len(partes)}\r\n".encode()]
    for parte in partes:
        if isinstance(parte, str):
            parte = parte.encode()
        comando.append(f"${len(parte)}\r\n".encode())
        comando.append(parte + b"\r\n")
    return b"".join(comando)


def _chaves_brute_force_redis(sock):
    sock.sendall(_comando_redis("KEYS", "brute_force:*"))
    resposta = _ler_resposta_redis(sock)

    if not resposta.startswith(b"*"):
        return []

    linhas = resposta.split(b"\r\n")
    chaves = []
    index = 1

    while index < len(linhas):
        if linhas[index].startswith(b"$") and index + 1 < len(linhas):
            chaves.append(linhas[index + 1])
            index += 2
            continue
        index += 1

    return chaves


def limpar_redis_teste():
    host = os.getenv("REDIS_TEST_HOST", "localhost")
    port = int(os.getenv("REDIS_TEST_PORT", "6379"))

    try:
        with socket.create_connection((host, port), timeout=2) as sock:
            chaves = _chaves_brute_force_redis(sock)
            if not chaves:
                return

            sock.sendall(_comando_redis("DEL", *chaves))
            _ler_resposta_redis(sock)
    except OSError:
        pass


@pytest.fixture(scope="function")
def limpar_tentativas_login():
    limpar_redis_teste()
    yield
    limpar_redis_teste()


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
    limpar_redis_teste()
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

    # Injeta os tokens no localStorage se já estiver logado
    if auth_manager.access_token:
        page.add_init_script(f"""
            localStorage.setItem('access_token', '{auth_manager.access_token}');
            localStorage.setItem('refresh_token', '{auth_manager.refresh_token}');
        """)

        # Renova token automaticamente se receber 401 em testes autenticados.
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
