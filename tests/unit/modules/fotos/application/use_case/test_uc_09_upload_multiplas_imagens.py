import asyncio
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from src.modules.fotos.application.use_case import uc_09 as uc_09_module
from src.modules.fotos.domain.entities.fotos import Foto


def run(coro):
    return asyncio.run(coro)


@pytest.mark.unit
@pytest.mark.sprint_02
class TestUc09UploadMultiplasImagensUseCase:
    """Cenários caixa preta para upload de imagens e criação de trecho."""

    def test_deve_processar_imagem_com_gps_e_criar_trecho(
        self,
        upload_multiplas_imagens_use_case,
        foto_repository,
        foto_storage,
        trecho_repository,
        make_imagem_upload_input_dto,
        monkeypatch,
    ):
        monkeypatch.setattr(
            uc_09_module,
            "uuid4",
            Mock(return_value=SimpleNamespace(hex="abc123")),
        )
        upload_multiplas_imagens_use_case._extrair_coordenadas = Mock(
            return_value=SimpleNamespace(latitude=-23.55, longitude=-46.63)
        )

        response = run(
            upload_multiplas_imagens_use_case.execute([make_imagem_upload_input_dto()])
        )

        foto_salva = foto_repository.save.call_args.args[0]
        assert isinstance(foto_salva, Foto)
        assert foto_salva.nome_original_arquivo == "foto.jpg"
        assert foto_salva.nome_aquivo == "abc123.jpg"
        assert foto_salva.latitude == -23.55
        assert foto_salva.longitude == -46.63
        foto_storage.save.assert_called_once_with(
            conteudo_arquivo=b"conteudo-da-imagem",
            nome_arquivo="abc123.jpg",
            content_type="image/jpeg",
        )
        trecho_repository.create_with_fotos.assert_called_once_with([10])
        assert response.trecho is not None
        assert response.trecho.id_trecho == "trecho-123"
        assert response.trecho.foto_ids == [10]
        assert len(response.success) == 1
        assert response.success[0].id == 10
        assert response.success[0].latitude == -23.55
        assert response.success[0].longitude == -46.63
        assert response.success[0].trecho_id == "trecho-123"
        assert response.failed == []

    def test_deve_rejeitar_arquivo_vazio_sem_chamar_dependencias_externas(
        self,
        upload_multiplas_imagens_use_case,
        foto_repository,
        foto_storage,
        trecho_repository,
        make_imagem_upload_input_dto,
    ):
        response = run(
            upload_multiplas_imagens_use_case.execute(
                [make_imagem_upload_input_dto(content=b"")]
            )
        )

        assert response.success == []
        assert len(response.failed) == 1
        assert response.failed[0].reason == "Arquivo vazio"
        foto_storage.save.assert_not_called()
        foto_repository.save.assert_not_called()
        trecho_repository.create_with_fotos.assert_not_called()

    @pytest.mark.parametrize(
        ("filename", "conteudo", "esperado"),
        [
            ("foto.gif", b"abc", "Formato inválido"),
            ("foto.jpg", b"ab", "Arquivo muito grande"),
        ],
    )
    def test_deve_rejeitar_formato_invalido_ou_arquivo_grande(
        self,
        upload_multiplas_imagens_use_case,
        foto_repository,
        foto_storage,
        trecho_repository,
        make_imagem_upload_input_dto,
        monkeypatch,
        filename,
        conteudo,
        esperado,
    ):
        if esperado == "Arquivo muito grande":
            monkeypatch.setattr(
                uc_09_module.Uc09UploadMultiplasImagensUseCase,
                "TAMANHO_MAXIMO_BYTES",
                1,
                raising=False,
            )

        response = run(
            upload_multiplas_imagens_use_case.execute(
                [make_imagem_upload_input_dto(filename=filename, content=conteudo)]
            )
        )

        assert len(response.failed) == 1
        assert esperado in response.failed[0].reason
        foto_storage.save.assert_not_called()
        foto_repository.save.assert_not_called()
        trecho_repository.create_with_fotos.assert_not_called()

    def test_deve_persistir_foto_sem_gps_com_presigned_url_na_falha(
        self,
        upload_multiplas_imagens_use_case,
        foto_repository,
        foto_storage,
        trecho_repository,
        make_imagem_upload_input_dto,
        monkeypatch,
    ):
        monkeypatch.setattr(
            uc_09_module,
            "uuid4",
            Mock(return_value=SimpleNamespace(hex="abc123")),
        )
        upload_multiplas_imagens_use_case._extrair_coordenadas = Mock(return_value=None)

        response = run(
            upload_multiplas_imagens_use_case.execute([make_imagem_upload_input_dto()])
        )

        foto_salva = foto_repository.save.call_args.args[0]
        assert foto_salva.latitude is None
        assert foto_salva.longitude is None
        assert response.success == []
        assert len(response.failed) == 1
        assert response.failed[0].id == 10
        assert response.failed[0].image_url == "http://localhost:9000/bucket/foto.jpg"
        assert response.failed[0].reason == "Foto sem localização (EXIF GPS não encontrado)"
        trecho_repository.create_with_fotos.assert_called_once_with([10])

    def test_deve_converter_excecao_em_falha_com_url_do_upload_ja_realizado(
        self,
        upload_multiplas_imagens_use_case,
        foto_repository,
        trecho_repository,
        make_imagem_upload_input_dto,
        monkeypatch,
    ):
        monkeypatch.setattr(
            uc_09_module,
            "uuid4",
            Mock(return_value=SimpleNamespace(hex="abc123")),
        )
        upload_multiplas_imagens_use_case._extrair_coordenadas = Mock(
            side_effect=RuntimeError("GPS quebrado")
        )

        response = run(
            upload_multiplas_imagens_use_case.execute([make_imagem_upload_input_dto()])
        )

        assert len(response.failed) == 1
        assert response.failed[0].reason == "GPS quebrado"
        assert response.failed[0].image_url == "bucket/foto.jpg"
        foto_repository.save.assert_not_called()
        trecho_repository.create_with_fotos.assert_not_called()
