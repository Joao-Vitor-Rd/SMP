"""Testes unitários do UC-08: atualização de supervisor.

Os testes cobrem o fluxo principal e as validações mais importantes para manter
o contrato do use case estável sem depender de persistência real.
"""

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
class TestAtualizarSupervisorUseCase:
    """Cenários principais da atualização de supervisor."""

    def test_deve_atualizar_supervisor_com_sucesso(
        self,
        atualizar_supervisor_use_case,
        supervisor_repository,
        supervisor_existente,
        telefone_validator,
        make_update_supervisor_dto,
    ):
        supervisor_repository.find_by_id.return_value = supervisor_existente

        response = atualizar_supervisor_use_case.execute(
            1,
            make_update_supervisor_dto(),
        )

        supervisor_atualizado = supervisor_repository.update_supervisor.call_args.args[0]
        assert supervisor_atualizado.name == "Maria Clara Atualizada"
        assert supervisor_atualizado.uf == "RJ"
        assert supervisor_atualizado.cidade == "Rio De Janeiro"
        assert supervisor_atualizado.empresa_ou_orgao == "nova empresa"
        assert supervisor_atualizado.telefone == "formatado:21999999999"
        telefone_validator.validar_telefone.assert_called_once_with("21999999999")
        telefone_validator.formatar_telefone.assert_called_once_with("21999999999")
        assert response.id == 1
        assert response.nome == "Maria Clara Atualizada"
        assert response.telefone == "formatado:21999999999"
        assert response.empresa == "nova empresa"

    def test_deve_rejeitar_supervisor_inexistente(
        self,
        atualizar_supervisor_use_case,
        supervisor_repository,
        make_update_supervisor_dto,
    ):
        supervisor_repository.find_by_id.return_value = None

        with pytest.raises(ValueError, match="Supervisor não encontrado"):
            atualizar_supervisor_use_case.execute(99, make_update_supervisor_dto())

        supervisor_repository.update_supervisor.assert_not_called()

    def test_deve_rejeitar_telefone_invalido(
        self,
        atualizar_supervisor_use_case,
        supervisor_repository,
        supervisor_existente,
        telefone_validator,
        make_update_supervisor_dto,
    ):
        supervisor_repository.find_by_id.return_value = supervisor_existente
        telefone_validator.validar_telefone.return_value = False

        with pytest.raises(ValueError, match="Telefone inválido"):
            atualizar_supervisor_use_case.execute(
                1,
                make_update_supervisor_dto(telefone="21999999999"),
            )

        telefone_validator.formatar_telefone.assert_not_called()
        supervisor_repository.update_supervisor.assert_not_called()

    def test_deve_limpar_campos_opcionais_quando_receber_texto_em_branco(
        self,
        atualizar_supervisor_use_case,
        supervisor_repository,
        supervisor_existente,
        make_update_supervisor_dto,
    ):
        supervisor_repository.find_by_id.return_value = supervisor_existente

        response = atualizar_supervisor_use_case.execute(
            1,
            make_update_supervisor_dto(
                cidade="   ",
                empresa_ou_orgao="   ",
                telefone="   ",
            ),
        )

        supervisor_atualizado = supervisor_repository.update_supervisor.call_args.args[0]
        assert supervisor_atualizado.cidade is None
        assert supervisor_atualizado.empresa_ou_orgao is None
        assert supervisor_atualizado.telefone is None
        assert response.cidade is None
        assert response.empresa is None
        assert response.telefone is None

    def test_deve_rejeitar_nome_em_branco(
        self,
        atualizar_supervisor_use_case,
        supervisor_repository,
        supervisor_existente,
        make_update_supervisor_dto,
    ):
        supervisor_repository.find_by_id.return_value = supervisor_existente

        with pytest.raises(ValueError, match="Nome não pode ser vazio"):
            atualizar_supervisor_use_case.execute(
                1,
                make_update_supervisor_dto(nome="   "),
            )

        supervisor_repository.update_supervisor.assert_not_called()