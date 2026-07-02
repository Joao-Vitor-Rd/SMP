from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.modules.trechos.application.dtos.trecho_filter_dto import (
    TrechoBoundingBoxFilterDTO,
)
from src.modules.trechos.application.use_case.uc_listar_trechos import (
    UcListarTrechosUseCase,
)


@pytest.fixture
def trecho_repository():
    mock = Mock()
    mock.list_all.return_value = []
    return mock


@pytest.fixture
def listar_trechos_use_case(trecho_repository):
    return UcListarTrechosUseCase(trecho_repository=trecho_repository)


@pytest.fixture
def make_trecho_filter_dto():
    def _make_trecho_filter_dto(**overrides):
        data = {
            "top_left_lat": -23.0,
            "top_left_lng": -47.0,
            "bottom_right_lat": -24.0,
            "bottom_right_lng": -46.0,
        }
        data.update(overrides)
        return TrechoBoundingBoxFilterDTO(**data)

    return _make_trecho_filter_dto


@pytest.fixture
def trecho_com_fotos():
    return SimpleNamespace(
        id_trecho="trecho-1",
        criado_em=datetime.now(timezone.utc),
        foto_ids=[1, 2],
        fotos=[
            SimpleNamespace(
                id=1,
                caminho_arquivo="bucket/foto-1.jpg",
                latitude=-23.5,
                longitude=-46.6,
            ),
            SimpleNamespace(
                id=None,
                caminho_arquivo="bucket/foto-sem-id.jpg",
                latitude=None,
                longitude=None,
            ),
        ],
        cidade="São Paulo",
        uf="SP",
        responsavel_tecnico="Responsavel Teste",
        classificacao_qualidade="Regular",
        pci=70.0,
        defeitos={},
        responsavel_id=1,
    )
