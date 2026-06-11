from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.modules.auth.application.dtos.login_dto import LoginDTO
from src.modules.auth.application.dtos.login_dto import RefreshTokenDTO
from src.modules.auth.application.use_cases import login_use_case as login_module
from src.modules.auth.application.use_cases.login_use_case import LoginUseCase
from src.modules.auth.application.use_cases.refresh_token_use_case import (
    RefreshTokenUseCase,
)


class AsyncSpy:
    def __init__(self, return_value=None):
        self.return_value = return_value
        self.calls = []

    async def __call__(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return self.return_value

    def assert_awaited_once_with(self, *args, **kwargs):
        assert self.calls == [(args, kwargs)]

    def assert_not_called(self):
        assert self.calls == []


@pytest.fixture
def auth_repository():
    return Mock()


@pytest.fixture
def auth_hasher():
    mock = Mock()
    mock.verify.return_value = True
    return mock


@pytest.fixture
def token_service():
    mock = Mock()
    mock.generate.return_value = "access-token"
    mock.generate_refresh_token.return_value = "refresh-token"
    mock.refresh_access_token.return_value = "new-access-token"
    return mock


@pytest.fixture
def limitador_tentativas():
    mock = Mock()
    mock.esta_bloqueado = AsyncSpy(return_value=False)
    mock.registrar_tentativa = AsyncSpy(return_value=1)
    mock.obter_tentativas = AsyncSpy(return_value=0)
    mock.obter_proxima_tentativa = AsyncSpy(
        return_value=datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    mock.resetar = AsyncSpy(return_value=None)
    return mock


@pytest.fixture
def login_use_case(
    auth_repository,
    auth_hasher,
    token_service,
    limitador_tentativas,
    monkeypatch,
):
    async def run_sync(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(login_module.asyncio, "to_thread", run_sync)
    return LoginUseCase(
        repository=auth_repository,
        hasher=auth_hasher,
        token_service=token_service,
        limitador=limitador_tentativas,
    )


@pytest.fixture
def refresh_token_use_case(token_service):
    return RefreshTokenUseCase(token_service=token_service)


@pytest.fixture
def usuario_supervisor():
    return SimpleNamespace(
        id=1,
        name="Maria Clara",
        email="maria.clara@example.com",
    )


@pytest.fixture
def usuario_colaborador():
    return SimpleNamespace(
        id=2,
        nome="Ana Clara",
        email="ana.clara@example.com",
    )


@pytest.fixture
def make_user_info(usuario_supervisor):
    def _make_user_info(**overrides):
        data = {
            "user": usuario_supervisor,
            "user_type": "supervisor",
            "cargo": "supervisor",
            "password": "senha-hash",
            "limite_acesso": None,
            "acesso_liberado": True,
            "nome": "Maria Clara",
            "identificador_profissional": "CREA-12345",
            "cft": None,
        }
        data.update(overrides)
        return data

    return _make_user_info


@pytest.fixture
def make_login_dto():
    def _make_login_dto(**overrides):
        data = {
            "email": "maria.clara@example.com",
            "senha": "Senha123",
            "lembrar_me": False,
        }
        data.update(overrides)
        return LoginDTO(**data)

    return _make_login_dto


@pytest.fixture
def make_refresh_token_dto():
    def _make_refresh_token_dto(**overrides):
        data = {
            "token_atualizacao": "refresh-token",
        }
        data.update(overrides)
        return RefreshTokenDTO(**data)

    return _make_refresh_token_dto
