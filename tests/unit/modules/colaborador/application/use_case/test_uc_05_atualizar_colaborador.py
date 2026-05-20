"""Testes unitários do UC-05: atualização de colaborador.

Este módulo valida `AtualizarColaboradorUseCase` de forma isolada. As fixtures
compartilhadas fornecem um colaborador existente, repositório mockado e
validadores controlados, deixando os testes focados nas regras de atualização:
normalização de texto, preservação ou limpeza de campos opcionais e rejeição de
dados inválidos.
"""

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
@pytest.mark.us_05
class TestAtualizarColaboradorUseCase:
    """Cenários principais para alteração dos dados cadastrais do colaborador."""

    def test_deve_atualizar_colaborador_com_sucesso(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        colaborador_existente,
        telefone_validator,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = colaborador_existente

        response = atualizar_colaborador_use_case.execute(
            10,
            make_update_colaborador_dto(),
        )

        colaborador_atualizado = colaborador_repository.update_colaborador.call_args.args[
            0
        ]
        assert colaborador_atualizado.id == 10
        assert colaborador_atualizado.nome == "Ana Clara"
        assert colaborador_atualizado.uf == "RJ"
        assert colaborador_atualizado.cidade == "Rio De Janeiro"
        assert colaborador_atualizado.empresa_ou_orgao == "Nova Empresa"
        assert colaborador_atualizado.instituicao_ensino == "Nova Escola"
        assert colaborador_atualizado.telefone == "formatado:21999999999"

        telefone_validator.validar_telefone.assert_called_once_with("21999999999")
        telefone_validator.formatar_telefone.assert_called_once_with("21999999999")
        assert response.id == 10
        assert response.nome == "Ana Clara"
        assert response.uf == "RJ"
        assert response.cidade == "Rio De Janeiro"
        assert response.telefone == "formatado:21999999999"
        assert response.status == "Ativo"

    def test_deve_rejeitar_colaborador_inexistente(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = None

        with pytest.raises(ValueError, match="Colaborador não encontrado"):
            atualizar_colaborador_use_case.execute(99, make_update_colaborador_dto())

        colaborador_repository.update_colaborador.assert_not_called()

    def test_deve_rejeitar_nome_com_numero(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        colaborador_existente,
        string_sem_numero_validator,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = colaborador_existente
        string_sem_numero_validator.validar_string_sem_numero.return_value = False

        with pytest.raises(ValueError, match="Nome deve incluir apenas letras"):
            atualizar_colaborador_use_case.execute(
                10,
                make_update_colaborador_dto(nome="Ana 123"),
            )

        colaborador_repository.update_colaborador.assert_not_called()

    def test_deve_rejeitar_cidade_com_numero(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        colaborador_existente,
        string_sem_numero_validator,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = colaborador_existente
        string_sem_numero_validator.validar_string_sem_numero.side_effect = [
            True,
            False,
        ]

        with pytest.raises(ValueError, match="Cidade deve incluir apenas letras"):
            atualizar_colaborador_use_case.execute(
                10,
                make_update_colaborador_dto(cidade="Cidade 123"),
            )

        colaborador_repository.update_colaborador.assert_not_called()

    def test_deve_rejeitar_uf_invalida(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        colaborador_existente,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = colaborador_existente

        with pytest.raises(ValueError, match="UF inválida"):
            atualizar_colaborador_use_case.execute(
                10,
                make_update_colaborador_dto(uf="XX"),
            )

        colaborador_repository.update_colaborador.assert_not_called()

    def test_deve_rejeitar_telefone_invalido(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        colaborador_existente,
        telefone_validator,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = colaborador_existente
        telefone_validator.validar_telefone.return_value = False

        with pytest.raises(ValueError, match="Telefone inválido"):
            atualizar_colaborador_use_case.execute(
                10,
                make_update_colaborador_dto(telefone="21999999999"),
            )

        telefone_validator.formatar_telefone.assert_not_called()
        colaborador_repository.update_colaborador.assert_not_called()

    def test_deve_limpar_campos_opcionais_quando_receber_texto_vazio(
        self,
        atualizar_colaborador_use_case,
        colaborador_repository,
        colaborador_existente,
        make_update_colaborador_dto,
    ):
        colaborador_repository.find_by_user_id.return_value = colaborador_existente

        response = atualizar_colaborador_use_case.execute(
            10,
            make_update_colaborador_dto(
                uf=None,
                cidade=None,
                empresa_ou_orgao="   ",
                instituicao_ensino="   ",
                telefone="   ",
            ),
        )

        colaborador_atualizado = colaborador_repository.update_colaborador.call_args.args[
            0
        ]
        assert colaborador_atualizado.uf == "SP"
        assert colaborador_atualizado.cidade == "Sao Paulo"
        assert colaborador_atualizado.empresa_ou_orgao is None
        assert colaborador_atualizado.instituicao_ensino is None
        assert colaborador_atualizado.telefone is None
        assert response.empresa_ou_orgao is None
        assert response.instituicao_ensino is None
        assert response.telefone is None
