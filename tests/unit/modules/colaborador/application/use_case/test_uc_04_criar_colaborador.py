"""Testes unitários do UC-04: criação de colaborador.

Este módulo exercita `CriarColaboradorUseCase` sem acesso a banco, SMTP ou
serviços externos. As dependências ficam centralizadas no `conftest.py` local,
permitindo que cada teste descreva apenas o cenário de negócio: criação de
colaborador temporário, criação de técnico, validações obrigatórias e rollback
quando o envio de notificação falha.
"""

from datetime import datetime, timedelta, timezone

import pytest

from src.modules.colaborador.domain.entities.colaborador import Colaborador


@pytest.mark.unit
@pytest.mark.sprint_01
@pytest.mark.us_04
class TestCriarColaboradorUseCase:
    """Cenários principais para cadastro de colaborador e técnico."""

    def test_deve_criar_colaborador_temporario_com_sucesso(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        criador_senha,
        hasher,
        email_sender,
        email_validator,
        email_unico_validator,
        make_create_colaborador_dto,
    ):
        dto = make_create_colaborador_dto()

        response = criar_colaborador_use_case.execute(dto)

        colaborador_salvo = colaborador_repository.save.call_args.args[0]
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
            cft=None,
        )
        assert response.id == 10
        assert response.nome == "Ana Clara"
        assert response.email == "ana.clara@example.com"
        assert response.status == "Ativo"

    def test_deve_criar_tecnico_com_cft_e_sem_limite_de_acesso(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        email_sender,
        make_create_colaborador_dto,
    ):
        response = criar_colaborador_use_case.execute(
            make_create_colaborador_dto(
                is_tecnico=True,
                cft=" 123.456.789-00 ",
                limite_acesso=None,
            )
        )

        colaborador_salvo = colaborador_repository.save.call_args.args[0]
        colaborador_repository.find_by_cft.assert_called_once_with("12345678900")
        assert colaborador_salvo.is_tecnico is True
        assert colaborador_salvo.cft == "12345678900"
        assert colaborador_salvo.limite_acesso is None
        assert response.cft == "12345678900"
        assert response.limite_acesso is None
        assert email_sender.enviar_notificacao.call_args.kwargs["is_tecnico"] is True
        assert email_sender.enviar_notificacao.call_args.kwargs["limite_acesso"] is None
        assert email_sender.enviar_notificacao.call_args.kwargs["cft"] == "12345678900"

    def test_deve_rejeitar_nome_com_numero(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        string_sem_numero_validator,
        make_create_colaborador_dto,
    ):
        string_sem_numero_validator.validar_string_sem_numero.return_value = False

        with pytest.raises(ValueError, match="Nome deve incluir apenas letras"):
            criar_colaborador_use_case.execute(
                make_create_colaborador_dto(nome="Ana 123")
            )

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_supervisor_inexistente(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        supervisor_repository,
        hasher,
        make_create_colaborador_dto,
    ):
        supervisor_repository.find_by_id.return_value = None

        with pytest.raises(
            ValueError,
            match="Supervisor com identificador: 1 não cadastrado no sistema",
        ):
            criar_colaborador_use_case.execute(make_create_colaborador_dto())

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_email_invalido(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        email_validator,
        email_unico_validator,
        make_create_colaborador_dto,
    ):
        email_validator.validar_email.return_value = False

        with pytest.raises(ValueError, match="Email inválido"):
            criar_colaborador_use_case.execute(make_create_colaborador_dto())

        email_validator.validar_email.assert_called_once_with("ana.clara@example.com")
        email_unico_validator.validar_email_unico.assert_not_called()
        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_email_ja_cadastrado(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        email_unico_validator,
        make_create_colaborador_dto,
    ):
        email_unico_validator.validar_email_unico.return_value = True

        with pytest.raises(ValueError, match="Email já cadastrado no sistema"):
            criar_colaborador_use_case.execute(make_create_colaborador_dto())

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    @pytest.mark.parametrize("cft", [None, "", "   "])
    def test_deve_rejeitar_tecnico_sem_cft(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        make_create_colaborador_dto,
        cft,
    ):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            criar_colaborador_use_case.execute(
                make_create_colaborador_dto(is_tecnico=True, cft=cft, limite_acesso=None)
            )
        assert exc_info.value.status_code == 400
        assert "CFT/CPF" in exc_info.value.detail

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_cft_com_tamanho_invalido(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        make_create_colaborador_dto,
    ):
        with pytest.raises(Exception):
            criar_colaborador_use_case.execute(
                make_create_colaborador_dto(is_tecnico=True, cft="123abc", limite_acesso=None)
            )

        colaborador_repository.find_by_cft.assert_not_called()
        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_cft_ja_cadastrado(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        make_create_colaborador_dto,
    ):
        colaborador_repository.find_by_cft.return_value = object()

        with pytest.raises(ValueError, match="CFT/CPF já cadastrado no sistema"):
            criar_colaborador_use_case.execute(
                make_create_colaborador_dto(is_tecnico=True, cft="12345678900", limite_acesso=None)
            )

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_exigir_limite_de_acesso_para_colaborador_temporario(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        make_create_colaborador_dto,
    ):
        with pytest.raises(
            ValueError,
            match="A data de expiração do acesso é obrigatória para colaborador",
        ):
            criar_colaborador_use_case.execute(
                make_create_colaborador_dto(limite_acesso=None)
            )

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_rejeitar_limite_de_acesso_no_passado(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        hasher,
        make_create_colaborador_dto,
    ):
        limite_passado = datetime.now(timezone.utc) - timedelta(minutes=1)

        with pytest.raises(
            ValueError,
            match="A data de acesso deve ser igual ou posterior ao momento atual.",
        ):
            criar_colaborador_use_case.execute(
                make_create_colaborador_dto(limite_acesso=limite_passado)
            )

        colaborador_repository.save.assert_not_called()
        hasher.hash.assert_not_called()

    def test_deve_remover_colaborador_salvo_quando_envio_de_email_falhar(
        self,
        criar_colaborador_use_case,
        colaborador_repository,
        email_sender,
        make_create_colaborador_dto,
    ):
        email_sender.enviar_notificacao.side_effect = RuntimeError("SMTP fora")

        with pytest.raises(RuntimeError, match="SMTP fora"):
            criar_colaborador_use_case.execute(make_create_colaborador_dto())

        colaborador_repository.save.assert_called_once()
        colaborador_repository.delete.assert_called_once_with(10)
