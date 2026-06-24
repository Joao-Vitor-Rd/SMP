import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from src.modules.trechos.application.use_case.uc_criar_laudo import CriarLaudoUseCase


@pytest.mark.unit
def test_criar_laudo_com_sucesso():
    repository = Mock()
    repository.create.return_value = Mock(id=1, responsavel="Responsavel")

    use_case = CriarLaudoUseCase(laudo_repository=repository)
    data = datetime.now(timezone.utc) - timedelta(hours=1)

    response = use_case.execute(
        responsavel="Engenheiro",
        credencial_responsavel="CREA-123",
        data=data,
        colaboradores_ids=[1, 2],
        resumo={}
    )

    assert response.id == 1
    repository.create.assert_called_once_with(
        responsavel="Engenheiro",
        data=data,
        colaboradores_ids=[1, 2],
        resumo={},
        credencial_responsavel="CREA-123"
    )


@pytest.mark.unit
def test_criar_laudo_rejeita_data_futura():
    repository = Mock()
    use_case = CriarLaudoUseCase(laudo_repository=repository)
    data_futura = datetime.now(timezone.utc) + timedelta(days=1)

    with pytest.raises(ValueError, match="A data do laudo não pode ser no futuro"):
        use_case.execute(
            responsavel="Engenheiro",
            credencial_responsavel="CREA-123",
            data=data_futura,
            colaboradores_ids=[1, 2],
            resumo={}
        )
