from unittest.mock import Mock

import pytest

from src.modules.supervisor.application.dtos import CreateSupervisorDTO
from src.modules.supervisor.application.user_case.uc_01 import CriarSupervisorUseCase


@pytest.fixture
def supervisor_repository():
    return Mock()


@pytest.fixture
def validador_crea():
    return Mock()


@pytest.fixture
def hasher():
    mock = Mock()
    mock.hash.return_value = "senha-hash"
    return mock


@pytest.fixture
def email_validator():
    mock = Mock()
    mock.validar_email.return_value = True
    return mock


@pytest.fixture
def email_unico_validator():
    mock = Mock()
    mock.validar_email_unico.return_value = False
    return mock


@pytest.fixture
def string_sem_numero_validator():
    mock = Mock()
    mock.formatar_string_sem_numero.side_effect = lambda valor: valor.strip()
    mock.validar_string_sem_numero.return_value = True
    return mock


@pytest.fixture
def criar_supervisor_use_case(
    supervisor_repository,
    validador_crea,
    hasher,
    email_validator,
    email_unico_validator,
    string_sem_numero_validator,
):
    return CriarSupervisorUseCase(
        repository=supervisor_repository,
        validador_crea=validador_crea,
        hasher=hasher,
        email_validator=email_validator,
        email_unico_validator=email_unico_validator,
        string_sem_numero_validator=string_sem_numero_validator,
    )


@pytest.fixture
def make_supervisor_dto():
    def _make_supervisor_dto(**overrides):
        data = {
            "nome": "  maria clara  ",
            "identificador_profissional": "CREA-12345",
            "uf": "SP",
            "cidade": "  sao paulo  ",
            "email": "  MARIA.CLARA@EXAMPLE.COM  ",
            "senha": "Senha123",
        }
        data.update(overrides)
        return CreateSupervisorDTO(**data)

    return _make_supervisor_dto
