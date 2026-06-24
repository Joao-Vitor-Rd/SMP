import pytest
from unittest.mock import Mock
from src.modules.trechos.application.use_case.uc_buscar_trecho_por_id import UcBuscarTrechoPorIdUseCase


@pytest.mark.unit
def test_deve_buscar_trecho_por_id_com_sucesso(trecho_com_fotos):
    repository = Mock()
    repository.find_by_id.return_value = trecho_com_fotos

    use_case = UcBuscarTrechoPorIdUseCase(trecho_repository=repository)
    response = use_case.execute(id_trecho="trecho-1")

    assert response.id_trecho == "trecho-1"
    assert len(response.fotos) == 1
    assert response.fotos[0].id == 1
    repository.find_by_id.assert_called_once_with("trecho-1")


@pytest.mark.unit
def test_deve_rejeitar_buscar_trecho_inexistente():
    repository = Mock()
    repository.find_by_id.return_value = None

    use_case = UcBuscarTrechoPorIdUseCase(trecho_repository=repository)

    with pytest.raises(ValueError, match="Trecho não encontrado"):
        use_case.execute(id_trecho="trecho-invalido")
