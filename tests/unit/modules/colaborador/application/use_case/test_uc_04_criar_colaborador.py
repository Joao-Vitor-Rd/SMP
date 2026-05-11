from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest

from src.modules.colaborador.application.dtos.colaborador_dto import CreateColaboradorDTO
from src.modules.colaborador.application.use_case.uc_04 import CriarColaboradorUseCase
from src.modules.colaborador.domain.entities.colaborador import Colaborador


@pytest.fixture
def repository():
    mock = Mock()
    mock.find_by_cft.return_value = None
    mock.save.side_effect = lambda colaborador: colaborador.model_copy(update={"id": 10})
    return mock


@pytest.fixture
def repository_supervisor():
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
    return Mock()


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
    repository_supervisor,
    criador_senha,
    hasher,
    email_sender,
    email_validator,
    telefone_validator,
    email_unico_validator,
    string_sem_numero_validator,
):
    return CriarColaboradorUseCase(
        repository=repository,
        repository_supervisor=repository_supervisor,
        criador_senha=criador_senha,
        hasher=hasher,
        email_sender=email_sender,
        email_validator=email_validator,
        telefone_validator=telefone_validator,
        email_unico_validator=email_unico_validator,
        string_sem_numero_validator=string_sem_numero_validator,
    )


def make_dto(**overrides):
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


@pytest.mark.unit
@pytest.mark.sprint_01
@pytest.mark.us_04
class TestCriarColaboradorUseCase:
    def test_deve_criar_colaborador_temporario_com_sucesso(
        self,
        use_case,
        repository,
        criador_senha,
        hasher,
        email_sender,
        email_validator,
        email_unico_validator,
    ):
        dto = make_dto()

        response = use_case.execute(dto)

        colaborador_salvo = repository.save.call_args.args[0]
        assert isinstance(colaborador_salvo, Colaborador)
        assert colaborador_salvo.nome == "Ana Clara"
        assert colaborador_salvo.email == "ana.clara@example.com"
        assert colaborador_salvo.senha == "senha-hash"
        assert colaborador_salvo.is_tecnico is False
        assert colaborador_salvo.cft is None
        assert colaborador_salvo.limite_acesso == dto.limite_acesso
        assert colaborador_salvo.acesso_liberado is True

        criador_senha.gerar_senha.assert_called_once_with()
        hasher.hash.assert_called_once_with("Senha123")
        email_validator.validar_email.assert_called_once_with("ana.clara@example.com")
        email_unico_validator.validar_email_unico.assert_called_once_with(
            "ana.clara@example.com"
        )
        email_sender.enviar_notificacao.assert_called_once_with(
            senha_usuario="Senha123",
            nome_usuario="Ana Clara",
            email_usuario="ana.clara@example.com",
            is_tecnico=False,
            limite_acesso=dto.limite_acesso,
        )
        assert response.id == 10
        assert response.nome == "Ana Clara"
        assert response.email == "ana.clara@example.com"
        assert response.status == "Ativo"

    def test_deve_criar_tecnico_com_cft_e_sem_limite_de_acesso(
        self,
        use_case,
        repository,
        email_sender,
    ):
        response = use_case.execute(
            make_dto(
                is_tecnico=True,
                cft=" 123456 ",
                limite_acesso=datetime.now(timezone.utc) + timedelta(days=3),
            )
        )

        colaborador_salvo = repository.save.call_args.args[0]
        repository.find_by_cft.assert_called_once_with("123456")
        assert colaborador_salvo.is_tecnico is True
        assert colaborador_salvo.cft == "123456"
        assert colaborador_salvo.limite_acesso is None
        assert response.cft == "123456"
        assert response.limite_acesso is None
        assert email_sender.enviar_notificacao.call_args.kwargs["is_tecnico"] is True
        assert email_sender.enviar_notificacao.call_args.kwargs["limite_acesso"] is None

    def test_deve_rejeitar_nome_com_numero(
        self,
        use_case,
        repository,
        hasher,
        string_sem_numero_validator,
    ):
        string_sem_numero_validator.validar_string_sem_numero.return_value = False

        with pytest.raises(ValueError, match="Nome deve incluir apenas letras"):
            use_case.execute(make_dto(nome="Ana 123"))

        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_supervisor_inexistente(
        self,
        use_case,
        repository,
        repository_supervisor,
        hasher,
    ):
        repository_supervisor.find_by_id.return_value = None

        with pytest.raises(
            ValueError,
            match="Supervisor com identificador: 1 não cadastrado no sistema",
        ):
            use_case.execute(make_dto())

        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_email_invalido(
        self,
        use_case,
        repository,
        hasher,
        email_validator,
        email_unico_validator,
    ):
        email_validator.validar_email.return_value = False

        with pytest.raises(ValueError, match="Email inválido"):
            use_case.execute(make_dto())

        email_validator.validar_email.assert_called_once_with("ana.clara@example.com")
        email_unico_validator.validar_email_unico.assert_not_called()
        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_email_ja_cadastrado(
        self,
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

    @pytest.mark.parametrize("cft", [None, "", "   "])
    def test_deve_rejeitar_tecnico_sem_cft(
        self,
        use_case,
        repository,
        hasher,
        cft,
    ):
        with pytest.raises(ValueError, match="CFT/CPF é obrigatório para técnico"):
            use_case.execute(make_dto(is_tecnico=True, cft=cft))

        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_cft_com_letras(
        self,
        use_case,
        repository,
        hasher,
    ):
        with pytest.raises(ValueError, match="CFT/CPF deve conter apenas números"):
            use_case.execute(make_dto(is_tecnico=True, cft="123abc"))

        repository.find_by_cft.assert_not_called()
        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_cft_ja_cadastrado(
        self,
        use_case,
        repository,
        hasher,
    ):
        repository.find_by_cft.return_value = Mock(id=99)

        with pytest.raises(ValueError, match="CFT/CPF já cadastrado no sistema"):
            use_case.execute(make_dto(is_tecnico=True, cft="123456"))

        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_exigir_limite_de_acesso_para_colaborador_temporario(
        self,
        use_case,
        repository,
        hasher,
    ):
        with pytest.raises(
            ValueError,
            match="A data de expiração do acesso é obrigatória para colaborador",
        ):
            use_case.execute(make_dto(limite_acesso=None))

        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_limite_de_acesso_no_passado(
        self,
        use_case,
        repository,
        hasher,
    ):
        limite_passado = datetime.now(timezone.utc) - timedelta(minutes=1)

        with pytest.raises(
            ValueError,
            match="A data de acesso deve ser igual ou posterior ao momento atual.",
        ):
            use_case.execute(make_dto(limite_acesso=limite_passado))

        repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_remover_colaborador_salvo_quando_envio_de_email_falhar(
        self,
        use_case,
        repository,
        email_sender,
    ):
        email_sender.enviar_notificacao.side_effect = RuntimeError("SMTP fora")

        with pytest.raises(RuntimeError, match="SMTP fora"):
            use_case.execute(make_dto())

        repository.save.assert_called_once()
        repository.delete.assert_called_once_with(10)
