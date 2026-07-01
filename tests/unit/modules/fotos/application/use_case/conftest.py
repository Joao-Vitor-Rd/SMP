from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.modules.fotos.application.dtos.foto_dto import (
    AtualizarLocalizacaoFotoInputDTO,
    ImagemUploadInputDTO,
)
from src.modules.fotos.application.use_case.uc_09 import Uc09UploadMultiplasImagensUseCase
from src.modules.fotos.application.use_case.uc_10_atualizar_localizacao_foto import (
    Uc10AtualizarLocalizacaoFotoUseCase,
)
from src.modules.fotos.domain.entities.fotos import Foto


@pytest.fixture
def foto_repository():
    mock = Mock()
    mock.save.side_effect = lambda foto: foto.model_copy(update={"id": 10})
    mock.find_by_id.return_value = None
    mock.update_localizacao.side_effect = lambda foto_id, latitude, longitude: SimpleNamespace(
        id=foto_id,
        latitude=latitude,
        longitude=longitude,
        trecho_id="trecho-123",
    )
    return mock


@pytest.fixture
def foto_storage():
    mock = Mock()
    mock.save.return_value = "bucket/foto.jpg"
    mock.get_presigned_url.side_effect = lambda caminho_arquivo, expira_em_segundos=3600: (
        f"http://localhost:9000/{caminho_arquivo}"
    )
    return mock


@pytest.fixture
def trecho_repository():
    mock = Mock()
    mock.create_with_fotos.side_effect = lambda foto_ids: SimpleNamespace(
        id_trecho="trecho-123",
        foto_ids=foto_ids,
    )
    return mock


@pytest.fixture
def upload_multiplas_imagens_use_case(foto_repository, foto_storage, trecho_repository):
    return Uc09UploadMultiplasImagensUseCase(
        foto_repository=foto_repository,
        foto_storage=foto_storage,
        trecho_repository=trecho_repository,
    )


@pytest.fixture
def atualizar_localizacao_foto_use_case(foto_repository):
    return Uc10AtualizarLocalizacaoFotoUseCase(foto_repository=foto_repository)


@pytest.fixture
def make_imagem_upload_input_dto():
    def _make_imagem_upload_input_dto(**overrides):
        data = {
            "filename": "foto.jpg",
            "content_type": "image/jpeg",
            "content": b"conteudo-da-imagem",
        }
        data.update(overrides)
        return ImagemUploadInputDTO(**data)

    return _make_imagem_upload_input_dto


@pytest.fixture
def make_atualizar_localizacao_foto_dto():
    def _make_atualizar_localizacao_foto_dto(**overrides):
        data = {
            "latitude": -23.55052,
            "longitude": -46.633308,
        }
        data.update(overrides)
        return AtualizarLocalizacaoFotoInputDTO(**data)

    return _make_atualizar_localizacao_foto_dto


@pytest.fixture
def foto_existente():
    return Foto(
        id=7,
        nome_original_arquivo="foto.jpg",
        nome_aquivo="foto-uuid.jpg",
        caminho_arquivo="bucket/foto-uuid.jpg",
        latitude=None,
        longitude=None,
        trecho_id=None,
        tipo_arquivo="image/jpeg",
        criado_em=datetime.now(timezone.utc),
    )
