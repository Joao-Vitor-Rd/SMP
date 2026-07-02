"""Testes unitários do use case de atualização de limite de acesso.

O caso cobre a regra de negócio para colaboradores temporários: somente não
técnicos podem receber limite de acesso, datas passadas devem ser rejeitadas e
valores sem timezone precisam ser normalizados para UTC antes da persistência.
"""

from datetime import datetime, timedelta, timezone

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
class TestAtualizarLimiteAcessoUseCase:
    """Cenários principais da alteração de validade de acesso."""

    def test_deve_atualizar_limite_com_timezone_utc_quando_receber_data_naive(
        self,
        atualizar_limite_acesso_use_case,
        colaborador_repository,
        colaborador_para_acesso,
        make_atualizar_limite_acesso_dto,
    ):
        limite_naive = datetime.now() + timedelta(days=1)
        colaborador_atualizado = colaborador_para_acesso.model_copy(
            update={
                "limite_acesso": limite_naive.replace(tzinfo=timezone.utc),
                "acesso_liberado": True,
            }
        )
        colaborador_repository.find_by_id.side_effect = [
            colaborador_para_acesso,
            colaborador_atualizado,
        ]

        response = atualizar_limite_acesso_use_case.execute(
            11,
            make_atualizar_limite_acesso_dto(limite_acesso=limite_naive),
        )

        limite_chamado = colaborador_repository.update_limite_acesso.call_args.args[1]
        acesso_liberado_chamado = colaborador_repository.update_limite_acesso.call_args.args[2]
        assert limite_chamado.tzinfo == timezone.utc
        assert limite_chamado.replace(tzinfo=None) == limite_naive
        assert acesso_liberado_chamado is True
        assert response.id == 11
        assert response.limite_acesso == limite_naive.replace(tzinfo=timezone.utc)
        assert response.acesso_liberado is True
        assert response.status == "Ativo"

    def test_deve_rejeitar_tecnico_com_limite_de_acesso(
        self,
        atualizar_limite_acesso_use_case,
        colaborador_repository,
        colaborador_tecnico,
        make_atualizar_limite_acesso_dto,
    ):
        colaborador_repository.find_by_id.return_value = colaborador_tecnico

        with pytest.raises(
            ValueError,
            match="Não é permitido definir limite de acesso para técnico",
        ):
            atualizar_limite_acesso_use_case.execute(
                12,
                make_atualizar_limite_acesso_dto(),
            )

        colaborador_repository.update_limite_acesso.assert_not_called()

    def test_deve_rejeitar_limite_de_acesso_no_passado(
        self,
        atualizar_limite_acesso_use_case,
        colaborador_repository,
        colaborador_para_acesso,
        make_atualizar_limite_acesso_dto,
    ):
        colaborador_repository.find_by_id.return_value = colaborador_para_acesso

        with pytest.raises(
            ValueError,
            match="A data de acesso deve ser igual ou posterior ao momento atual.",
        ):
            atualizar_limite_acesso_use_case.execute(
                11,
                make_atualizar_limite_acesso_dto(
                    limite_acesso=datetime.now(timezone.utc) - timedelta(minutes=1)
                ),
            )

        colaborador_repository.update_limite_acesso.assert_not_called()

    def test_deve_rejeitar_colaborador_inexistente(
        self,
        atualizar_limite_acesso_use_case,
        colaborador_repository,
        make_atualizar_limite_acesso_dto,
    ):
        colaborador_repository.find_by_id.return_value = None

        with pytest.raises(
            ValueError,
            match="Colaborador com identificador 99 não encontrado",
        ):
            atualizar_limite_acesso_use_case.execute(
                99,
                make_atualizar_limite_acesso_dto(),
            )

        colaborador_repository.update_limite_acesso.assert_not_called()
