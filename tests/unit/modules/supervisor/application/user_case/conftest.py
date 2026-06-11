from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.modules.supervisor.application.dtos import CreateSupervisorDTO
from src.modules.supervisor.application.dtos import UpdateSupervisorDTO
from src.modules.supervisor.application.user_case.uc_01 import CriarSupervisorUseCase
from src.modules.supervisor.application.user_case.ListarSupervisorUseCase import (
    ListarSupervisorUseCase,
)
from src.modules.supervisor.application.user_case.uc_08 import AtualizarSupervisorUseCase
from src.modules.supervisor.application.user_case.uc_listar_meus_colaboradores import (
    ListarMeusColaboradores,
)


@pytest.fixture
def supervisor_repository():
    mock = Mock()
    mock.find_by_id.return_value = None
    mock.find_all.return_value = []
    mock.listar_meus_colaboradores.return_value = []
    mock.update_supervisor.side_effect = lambda supervisor: supervisor
    return mock


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
def telefone_validator():
    mock = Mock()
    mock.validar_telefone.return_value = True
    mock.formatar_telefone.side_effect = lambda valor: f"formatado:{valor}"
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
def atualizar_supervisor_use_case(
    supervisor_repository,
    string_sem_numero_validator,
    telefone_validator,
):
    return AtualizarSupervisorUseCase(
        repository=supervisor_repository,
        string_sem_numero_validator=string_sem_numero_validator,
        telefone_validator=telefone_validator,
    )


@pytest.fixture
def listar_supervisor_use_case(supervisor_repository):
    return ListarSupervisorUseCase(repository=supervisor_repository)


@pytest.fixture
def listar_meus_colaboradores_use_case(supervisor_repository):
    return ListarMeusColaboradores(repository=supervisor_repository)


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


@pytest.fixture
def make_update_supervisor_dto():
    def _make_update_supervisor_dto(**overrides):
        data = {
            "nome": "  maria clara atualizada  ",
            "uf": "RJ",
            "cidade": "  rio de janeiro  ",
            "empresa_ou_orgao": "  nova empresa  ",
            "telefone": " 21999999999 ",
        }
        data.update(overrides)
        return UpdateSupervisorDTO(**data)

    return _make_update_supervisor_dto


@pytest.fixture
def supervisor_existente():
    return SimpleNamespace(
        id=1,
        name="Maria Clara",
        email="maria.clara@example.com",
        idendificador_profissional="CREA-12345",
        uf="SP",
        cidade="Sao Paulo",
        empresa_ou_orgao="Empresa Antiga",
        telefone="11999999999",
    )


@pytest.fixture
def lista_supervisores():
    return [
        SimpleNamespace(
            id=1,
            name="Maria Clara",
            email="maria.clara@example.com",
            idendificador_profissional="CREA-12345",
            uf="SP",
            cidade="Sao Paulo",
            telefone="11999999999",
            empresa_ou_orgao="Empresa 1",
        ),
        SimpleNamespace(
            id=2,
            name="Joao Pedro",
            email="joao.pedro@example.com",
            idendificador_profissional="CREA-54321",
            uf="RJ",
            cidade="Rio De Janeiro",
            telefone="21988887777",
            empresa_ou_orgao="Empresa 2",
        ),
    ]


@pytest.fixture
def meus_colaboradores():
    from src.modules.colaborador.application.dtos.colaborador_dto import ListarColaboradoresDTO

    return [
        ListarColaboradoresDTO(
            id=10,
            nome="Ana Clara",
            email="ana.clara@example.com",
            limite_acesso=datetime.now(timezone.utc) + timedelta(days=2),
            ativo=True,
        ),
        ListarColaboradoresDTO(
            id=11,
            nome="Pedro Lima",
            email="pedro.lima@example.com",
            limite_acesso=None,
            ativo=False,
        ),
    ]
