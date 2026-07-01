import pytest


@pytest.mark.unit
@pytest.mark.sprint_02
class TestUcListarTrechosUseCase:
    """Cenários focados em mistura/limites para listar trechos.

    - mistura: trechos com fotos que possuem `id` e fotos sem `id` devem manter
      apenas as fotos com `id` no DTO de resposta.
    - vazio: repositório retorna lista vazia => resposta com items vazia.
    """

    def test_mistura_fotos_com_e_sem_id(
        self,
        listar_trechos_use_case,
        trecho_repository,
        trecho_com_fotos,
        make_trecho_filter_dto,
    ):
        # arrange
        trecho_repository.list_all.return_value = [trecho_com_fotos]
        filtro = make_trecho_filter_dto()

        # act
        response = listar_trechos_use_case.execute(bbox_filter=filtro)

        # assert
        trecho_repository.list_all.assert_called_once_with(bbox_filter=filtro)
        assert isinstance(response.items, list)
        assert len(response.items) == 1

        item = response.items[0]
        # foto_ids mantém os ids incluindo o que é None
        assert item.foto_ids == [1, 2]

        # mas a lista `fotos` no DTO contém somente as fotos com id
        assert len(item.fotos) == 1
        foto_dto = item.fotos[0]
        assert foto_dto.id == 1
        assert foto_dto.caminho_arquivo == "bucket/foto-1.jpg"
        assert foto_dto.latitude == -23.5
        assert foto_dto.longitude == -46.6

    def test_retorna_vazio_quando_nao_existirem_trechos(self, listar_trechos_use_case, trecho_repository):
        trecho_repository.list_all.return_value = []

        response = listar_trechos_use_case.execute()

        assert hasattr(response, "items")
        assert response.items == []
