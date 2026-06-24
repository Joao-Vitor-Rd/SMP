import pytest
from unittest.mock import Mock
from src.modules.trechos.application.dtos.trecho_dto import TrechoUpdateDTO
from src.modules.trechos.application.use_case.uc_atualizar_trecho import UcAtualizarTrechoUseCase


@pytest.mark.unit
def test_deve_atualizar_trecho_com_sucesso(trecho_com_fotos):
    repository = Mock()
    repository.find_by_id.return_value = trecho_com_fotos
    repository.update.return_value = trecho_com_fotos

    use_case = UcAtualizarTrechoUseCase(trecho_repository=repository)
    dto = TrechoUpdateDTO(cidade="São Paulo", uf="SP", classificacaoQualidade="Bom")

    response = use_case.execute(id_trecho="trecho-1", dto=dto)

    assert response.id_trecho == "trecho-1"
    repository.find_by_id.assert_called_once_with("trecho-1")
    repository.update.assert_called_once_with(
        "trecho-1",
        {
            "cidade": "São Paulo",
            "uf": "SP",
            "classificacao_qualidade": "Bom"
        }
    )


@pytest.mark.unit
def test_deve_rejeitar_atualizar_trecho_inexistente():
    repository = Mock()
    repository.find_by_id.return_value = None

    use_case = UcAtualizarTrechoUseCase(trecho_repository=repository)
    dto = TrechoUpdateDTO(cidade="São Paulo")

    with pytest.raises(ValueError, match="Trecho não encontrado"):
        use_case.execute(id_trecho="trecho-invalido", dto=dto)
