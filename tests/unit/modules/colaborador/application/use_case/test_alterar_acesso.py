"""Testes unitários do use case de alternar acesso do colaborador.

O objetivo é validar o comportamento de bloqueio/liberação sem depender do
banco: o repositório é mockado e o teste verifica a chamada de atualização e a
forma da resposta retornada.
"""

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
class TestAlternarAcessoLiberdoUseCase:
    """Cenários principais para alternar o acesso de um colaborador."""

    def test_deve_alternar_acesso_com_sucesso(
        self,
        alterar_acesso_use_case,
        colaborador_repository,
        colaborador_para_acesso,
    ):
        colaborador_atualizado = colaborador_para_acesso.model_copy(
            update={"acesso_liberado": True}
        )
        colaborador_repository.find_by_id.side_effect = [
            colaborador_para_acesso,
            colaborador_atualizado,
        ]

        response = alterar_acesso_use_case.execute(11)

        colaborador_repository.update_acesso.assert_called_once_with(11)
        assert colaborador_repository.find_by_id.call_count == 2
        assert response.id == 11
        assert response.acesso_liberado is True
        assert response.status == "Ativo"

    def test_deve_rejeitar_colaborador_inexistente(
        self,
        alterar_acesso_use_case,
        colaborador_repository,
    ):
        colaborador_repository.find_by_id.return_value = None

        with pytest.raises(
            ValueError,
            match="Colaborador com identificador 99 não encontrado",
        ):
            alterar_acesso_use_case.execute(99)

        colaborador_repository.update_acesso.assert_not_called()