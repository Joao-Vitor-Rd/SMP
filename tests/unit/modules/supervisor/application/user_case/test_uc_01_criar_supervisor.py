from unittest.mock import Mock

import pytest

from src.modules.supervisor.application.dtos import CreateSupervisorDTO
from src.modules.supervisor.application.user_case.uc_01 import CriarSupervisorUseCase
from src.modules.supervisor.domain.entities.supervisor import Supervisor


@pytest.fixture
def repository():
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
def use_case(
    repository,
    validador_crea,
    hasher,
    email_validator,
    email_unico_validator,
    string_sem_numero_validator,
):
    return CriarSupervisorUseCase(
        repository=repository,
        validador_crea=validador_crea,
        hasher=hasher,
        email_validator=email_validator,
        email_unico_validator=email_unico_validator,
        string_sem_numero_validator=string_sem_numero_validator,
    )


def make_dto(**overrides):
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


@pytest.mark.unit
def test_execute_cria_supervisor_com_dados_formatados_e_senha_hash(
    use_case,
    repository,
    hasher,
    email_validator,
    email_unico_validator,
):
    repository.save.side_effect = lambda supervisor: supervisor.model_copy(update={"id": 42})

    response = use_case.execute(make_dto())

    supervisor_salvo = repository.save.call_args.args[0]
    assert isinstance(supervisor_salvo, Supervisor)
    assert supervisor_salvo.name == "Maria Clara"
    assert supervisor_salvo.cidade == "Sao Paulo"
    assert supervisor_salvo.email == "maria.clara@example.com"
    assert supervisor_salvo.password == "senha-hash"
    assert supervisor_salvo.idendificador_profissional == "CREA-12345"
    assert supervisor_salvo.uf == "SP"

    hasher.hash.assert_called_once_with("Senha123")
    email_validator.validar_email.assert_called_once_with("maria.clara@example.com")
    email_unico_validator.validar_email_unico.assert_called_once_with(
        "maria.clara@example.com"
    )
    assert response.id == 42
    assert response.nome == "Maria Clara"
    assert response.email == "maria.clara@example.com"
    assert response.cidade == "Sao Paulo"


@pytest.mark.unit
def test_execute_nao_chama_validador_crea_enquanto_regra_estiver_desativada(
    use_case,
    repository,
    validador_crea,
):
    repository.save.side_effect = lambda supervisor: supervisor.model_copy(update={"id": 1})

    use_case.execute(make_dto())

    validador_crea.validar.assert_not_called()


@pytest.mark.unit
def test_execute_rejeita_uf_invalida(use_case, repository, hasher):
    with pytest.raises(ValueError, match="UF inválida"):
        use_case.execute(make_dto(uf="XX"))

    repository.save.assert_not_called()
    hasher.hash.assert_not_called()


@pytest.mark.unit
def test_execute_rejeita_email_com_formato_invalido(
    use_case,
    repository,
    hasher,
    email_validator,
    email_unico_validator,
):
    email_validator.validar_email.return_value = False

    with pytest.raises(ValueError, match="Email inválido"):
        use_case.execute(make_dto())

    email_validator.validar_email.assert_called_once_with("maria.clara@example.com")
    email_unico_validator.validar_email_unico.assert_not_called()
    repository.save.assert_not_called()
    hasher.hash.assert_not_called()


@pytest.mark.unit
def test_execute_rejeita_email_ja_cadastrado(
    use_case,
    repository,
    hasher,
    email_unico_validator,
):
    email_unico_validator.validar_email_unico.return_value = True

    with pytest.raises(ValueError, match="Email já cadastrado no sistema"):
        use_case.execute(make_dto())

    repository.save.assert_not_called()
    hasher.hash.assert_not_called()


@pytest.mark.unit
@pytest.mark.parametrize(
    ("senha", "mensagem"),
    [
        ("Abc123", "Senha deve conter 8 caracteres"),
        (
            "senhasemnumero",
            "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número",
        ),
        (
            "SENHASEMNUMERO",
            "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número",
        ),
        (
            "senhasemmai123",
            "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número",
        ),
    ],
)
def test_execute_rejeita_senha_fora_da_politica(
    use_case,
    repository,
    hasher,
    senha,
    mensagem,
):
    with pytest.raises(ValueError, match=mensagem):
        use_case.execute(make_dto(senha=senha))

    repository.save.assert_not_called()
    hasher.hash.assert_not_called()


@pytest.mark.unit
@pytest.mark.parametrize(
    ("campo", "mensagem"),
    [
        ("nome", "Nome deve incluir apenas letras"),
        ("cidade", "Cidade deve incluir apenas letras"),
    ],
)
def test_execute_rejeita_nome_ou_cidade_com_numeros(
    use_case,
    repository,
    hasher,
    string_sem_numero_validator,
    campo,
    mensagem,
):
    string_sem_numero_validator.validar_string_sem_numero.side_effect = (
        lambda valor: valor != "Valor 123"
    )

    with pytest.raises(ValueError, match=mensagem):
        use_case.execute(make_dto(**{campo: "Valor 123"}))

    repository.save.assert_not_called()
    hasher.hash.assert_not_called()
