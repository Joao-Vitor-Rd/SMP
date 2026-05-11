import pytest

from src.modules.supervisor.domain.entities.supervisor import Supervisor


@pytest.mark.unit
def test_execute_cria_supervisor_com_dados_formatados_e_senha_hash(
    criar_supervisor_use_case,
    supervisor_repository,
    hasher,
    email_validator,
    email_unico_validator,
    make_supervisor_dto,
):
    supervisor_repository.save.side_effect = lambda supervisor: supervisor.model_copy(
        update={"id": 42}
    )

    response = criar_supervisor_use_case.execute(make_supervisor_dto())

    supervisor_salvo = supervisor_repository.save.call_args.args[0]
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
    criar_supervisor_use_case,
    supervisor_repository,
    validador_crea,
    make_supervisor_dto,
):
    supervisor_repository.save.side_effect = lambda supervisor: supervisor.model_copy(
        update={"id": 1}
    )

    criar_supervisor_use_case.execute(make_supervisor_dto())

    validador_crea.validar.assert_not_called()


@pytest.mark.unit
def test_execute_rejeita_uf_invalida(
    criar_supervisor_use_case,
    supervisor_repository,
    hasher,
    make_supervisor_dto,
):
    with pytest.raises(ValueError, match="UF inválida"):
        criar_supervisor_use_case.execute(make_supervisor_dto(uf="XX"))

    supervisor_repository.save.assert_not_called()
    hasher.hash.assert_not_called()


@pytest.mark.unit
def test_execute_rejeita_email_com_formato_invalido(
    criar_supervisor_use_case,
    supervisor_repository,
    hasher,
    email_validator,
    email_unico_validator,
    make_supervisor_dto,
):
    email_validator.validar_email.return_value = False

    with pytest.raises(ValueError, match="Email inválido"):
        criar_supervisor_use_case.execute(make_supervisor_dto())

    email_validator.validar_email.assert_called_once_with("maria.clara@example.com")
    email_unico_validator.validar_email_unico.assert_not_called()
    supervisor_repository.save.assert_not_called()
    hasher.hash.assert_not_called()


@pytest.mark.unit
def test_execute_rejeita_email_ja_cadastrado(
    criar_supervisor_use_case,
    supervisor_repository,
    hasher,
    email_unico_validator,
    make_supervisor_dto,
):
    email_unico_validator.validar_email_unico.return_value = True

    with pytest.raises(ValueError, match="Email já cadastrado no sistema"):
        criar_supervisor_use_case.execute(make_supervisor_dto())

    supervisor_repository.save.assert_not_called()
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
    criar_supervisor_use_case,
    supervisor_repository,
    hasher,
    make_supervisor_dto,
    senha,
    mensagem,
):
    with pytest.raises(ValueError, match=mensagem):
        criar_supervisor_use_case.execute(make_supervisor_dto(senha=senha))

    supervisor_repository.save.assert_not_called()
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
    criar_supervisor_use_case,
    supervisor_repository,
    hasher,
    string_sem_numero_validator,
    make_supervisor_dto,
    campo,
    mensagem,
):
    string_sem_numero_validator.validar_string_sem_numero.side_effect = (
        lambda valor: valor != "Valor 123"
    )

    with pytest.raises(ValueError, match=mensagem):
        criar_supervisor_use_case.execute(make_supervisor_dto(**{campo: "Valor 123"}))

    supervisor_repository.save.assert_not_called()
    hasher.hash.assert_not_called()
