from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest

from src.modules.colaborador.application.dtos.colaborador_dto import (
    AtualizarLimiteAcessoDTO,
    CreateColaboradorDTO,
    UpdateColaboradorDTO,
)
from src.modules.colaborador.application.use_case.uc_04 import CriarColaboradorUseCase
from src.modules.colaborador.application.use_case.uc_05 import AtualizarColaboradorUseCase
from src.modules.colaborador.application.use_case.alterar_acesso import (
    AlternarAcessoLiberdoUseCase,
)
from src.modules.colaborador.application.use_case.alterar_limite_acesso import (
    AtualizarLimiteAcessoUseCase,
)
from src.modules.colaborador.domain.entities.colaborador import Colaborador


@pytest.fixture
def colaborador_repository():
    mock = Mock()
    mock.find_by_cft.return_value = None
    mock.find_by_user_id.return_value = None
    mock.find_by_id.return_value = None
    mock.save.side_effect = lambda colaborador: colaborador.model_copy(update={"id": 10})
    mock.update_colaborador.side_effect = lambda colaborador: colaborador
    mock.update_acesso.side_effect = lambda colaborador_id: None
    mock.update_limite_acesso.side_effect = lambda colaborador_id, limite_acesso: None
    return mock


@pytest.fixture
def supervisor_repository():
    mock = Mock()
    mock.find_by_id.return_value = Mock(id=1)
    return mock


@pytest.fixture
def criador_senha():
    mock = Mock()
    mock.gerar_senha.return_value = "Senha123"
    return mock


@pytest.fixture
def hasher():
    mock = Mock()
    mock.hash.return_value = "senha-hash"
    return mock


@pytest.fixture
def email_sender():
    return Mock()


@pytest.fixture
def email_validator():
    mock = Mock()
    mock.validar_email.return_value = True
    return mock


@pytest.fixture
def telefone_validator():
    mock = Mock()
    mock.validar_telefone.return_value = True
    mock.formatar_telefone.side_effect = lambda telefone: f"formatado:{telefone}"
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
def criar_colaborador_use_case(
    colaborador_repository,
    supervisor_repository,
    criador_senha,
    hasher,
    email_sender,
    email_validator,
    telefone_validator,
    email_unico_validator,
    string_sem_numero_validator,
):
    return CriarColaboradorUseCase(
        repository=colaborador_repository,
        repository_supervisor=supervisor_repository,
        criador_senha=criador_senha,
        hasher=hasher,
        email_sender=email_sender,
        email_validator=email_validator,
        telefone_validator=telefone_validator,
        email_unico_validator=email_unico_validator,
        string_sem_numero_validator=string_sem_numero_validator,
    )


@pytest.fixture
def atualizar_colaborador_use_case(
    colaborador_repository,
    string_sem_numero_validator,
    telefone_validator,
):
    return AtualizarColaboradorUseCase(
        repository=colaborador_repository,
        string_sem_numero_validator=string_sem_numero_validator,
        telefone_validator=telefone_validator,
    )


@pytest.fixture
def alterar_acesso_use_case(colaborador_repository):
    return AlternarAcessoLiberdoUseCase(repository=colaborador_repository)


@pytest.fixture
def atualizar_limite_acesso_use_case(colaborador_repository):
    return AtualizarLimiteAcessoUseCase(repository=colaborador_repository)


@pytest.fixture
def make_create_colaborador_dto():
    def _make_create_colaborador_dto(**overrides):
        data = {
            "nome": "  ana clara  ",
            "id_profissional_responsavel": 1,
            "is_tecnico": False,
            "email": "ANA.CLARA@EXAMPLE.COM",
            "cft": None,
            "limite_acesso": datetime.now(timezone.utc) + timedelta(days=3),
        }
        data.update(overrides)
        return CreateColaboradorDTO(**data)

    return _make_create_colaborador_dto


@pytest.fixture
def colaborador_existente():
    return Colaborador(
        id=10,
        nome="Nome Antigo",
        email="ana.clara@example.com",
        is_tecnico=False,
        id_profissional_responsavel=1,
        cft=None,
        uf="SP",
        cidade="Sao Paulo",
        empresa_ou_orgao="Empresa Antiga",
        telefone="11999999999",
        instituicao_ensino="Escola Antiga",
        senha="senha-hash",
        limite_acesso=datetime.now(timezone.utc) + timedelta(days=3),
        acesso_liberado=True,
    )


@pytest.fixture
def colaborador_para_acesso():
    return Colaborador(
        id=11,
        nome="Ana Clara",
        email="ana.clara@example.com",
        is_tecnico=False,
        id_profissional_responsavel=1,
        cft=None,
        uf="SP",
        cidade="Sao Paulo",
        empresa_ou_orgao="Empresa",
        telefone="11999999999",
        instituicao_ensino="Escola",
        senha="senha-hash",
        limite_acesso=datetime.now(timezone.utc) + timedelta(days=3),
        acesso_liberado=False,
    )


@pytest.fixture
def colaborador_tecnico():
    return Colaborador(
        id=12,
        nome="Ana Tecnica",
        email="ana.tecnica@example.com",
        is_tecnico=True,
        id_profissional_responsavel=1,
        cft="12345678900",
        uf="SP",
        cidade="Sao Paulo",
        empresa_ou_orgao="Empresa",
        telefone="11999999999",
        instituicao_ensino="Escola",
        senha="senha-hash",
        limite_acesso=None,
        acesso_liberado=True,
    )


@pytest.fixture
def make_update_colaborador_dto():
    def _make_update_colaborador_dto(**overrides):
        data = {
            "nome": "  ana clara  ",
            "uf": "RJ",
            "cidade": "  rio de janeiro  ",
            "empresa_ou_orgao": "  Nova Empresa  ",
            "telefone": " 21999999999 ",
            "instituicao_ensino": "  Nova Escola  ",
        }
        data.update(overrides)
        return UpdateColaboradorDTO(**data)

    return _make_update_colaborador_dto


@pytest.fixture
def make_atualizar_limite_acesso_dto():
    def _make_atualizar_limite_acesso_dto(**overrides):
        data = {
            "limite_acesso": datetime.now(timezone.utc) + timedelta(days=2),
        }
        data.update(overrides)
        return AtualizarLimiteAcessoDTO(**data)

    return _make_atualizar_limite_acesso_dto
