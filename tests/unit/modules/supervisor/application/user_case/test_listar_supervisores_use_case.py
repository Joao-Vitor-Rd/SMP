"""Testes unitários do use case de listagem de supervisores."""

import pytest


@pytest.mark.unit
@pytest.mark.sprint_01
class TestListarSupervisorUseCase:
    """Cenários principais da listagem de supervisores."""

    def test_deve_mapear_supervisores_para_dtos_de_resposta(
        self,
        listar_supervisor_use_case,
        supervisor_repository,
        lista_supervisores,
    ):
        supervisor_repository.find_all.return_value = lista_supervisores

        response = listar_supervisor_use_case.execute()

        supervisor_repository.find_all.assert_called_once_with()
        assert len(response) == 2
        assert response[0].nome == "Maria Clara"
        assert response[0].identificador_profissional == "CREA-12345"
        assert response[0].empresa == "Empresa 1"
        assert response[1].nome == "Joao Pedro"
        assert response[1].cidade == "Rio De Janeiro"