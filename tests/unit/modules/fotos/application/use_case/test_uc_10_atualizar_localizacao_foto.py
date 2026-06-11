import pytest


@pytest.mark.unit
@pytest.mark.sprint_02
class TestUc10AtualizarLocalizacaoFotoUseCase:
    """Cenários de localização de foto em formato caixa preta."""

    def test_deve_atualizar_localizacao_com_sucesso(
        self,
        atualizar_localizacao_foto_use_case,
        foto_repository,
        foto_existente,
        make_atualizar_localizacao_foto_dto,
    ):
        foto_atualizada = foto_existente.model_copy(
            update={
                "latitude": -23.55052,
                "longitude": -46.633308,
                "trecho_id": "trecho-123",
            }
        )
        foto_repository.find_by_id.return_value = foto_existente
        foto_repository.update_localizacao.return_value = foto_atualizada

        response = atualizar_localizacao_foto_use_case.execute(
            7,
            make_atualizar_localizacao_foto_dto(),
        )

        foto_repository.find_by_id.assert_called_once_with(7)
        foto_repository.update_localizacao.assert_called_once_with(
            foto_id=7,
            latitude=-23.55052,
            longitude=-46.633308,
        )
        assert response.id == 7
        assert response.latitude == -23.55052
        assert response.longitude == -46.633308
        assert response.trecho_id == "trecho-123"

    def test_deve_rejeitar_foto_inexistente(
        self,
        atualizar_localizacao_foto_use_case,
        foto_repository,
        make_atualizar_localizacao_foto_dto,
    ):
        foto_repository.find_by_id.return_value = None

        with pytest.raises(ValueError, match="Foto nao encontrada"):
            atualizar_localizacao_foto_use_case.execute(
                99,
                make_atualizar_localizacao_foto_dto(),
            )

        foto_repository.update_localizacao.assert_not_called()

    def test_deve_rejeitar_quando_repositorio_nao_conseguir_atualizar(
        self,
        atualizar_localizacao_foto_use_case,
        foto_repository,
        foto_existente,
        make_atualizar_localizacao_foto_dto,
    ):
        foto_repository.find_by_id.return_value = foto_existente
        foto_repository.update_localizacao.side_effect = lambda *args, **kwargs: None

        with pytest.raises(ValueError, match="Foto nao encontrada"):
            atualizar_localizacao_foto_use_case.execute(
                7,
                make_atualizar_localizacao_foto_dto(),
            )
