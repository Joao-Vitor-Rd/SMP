"""Testes unitários do use case de listar colaboradores do supervisor."""

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
class TestListarMeusColaboradoresUseCase:
    """Cenários principais de listagem de colaboradores do supervisor."""

    def test_deve_retorna_lista_do_repositorio_sem_alterar_o_contrato(
        self,
        listar_meus_colaboradores_use_case,
        supervisor_repository,
        meus_colaboradores,
    ):
        supervisor_repository.listar_meus_colaboradores.return_value = meus_colaboradores

        response = listar_meus_colaboradores_use_case.execute(1)

        supervisor_repository.listar_meus_colaboradores.assert_called_once_with(1)
        assert response == meus_colaboradores