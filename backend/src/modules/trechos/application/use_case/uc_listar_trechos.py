from src.modules.trechos.application.dtos.trecho_dto import (
    TrechoFotoDTO,
    TrechoListItemDTO,
    TrechoListResponseDTO,
)
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository


class UcListarTrechosUseCase:
    def __init__(self, trecho_repository: ITrechoRepository):
        self.trecho_repository = trecho_repository

    def execute(self, bbox_filter: TrechoBoundingBoxFilterDTO | None = None) -> TrechoListResponseDTO:
        trechos = self.trecho_repository.list_all(bbox_filter=bbox_filter)

        trecho_items: list[TrechoListItemDTO] = []
        for trecho in trechos:
            fotos = []
            for foto in trecho.fotos:
                if foto.id is None:
                    continue
                fotos.append(
                    TrechoFotoDTO(
                        id=foto.id,
                        caminho_arquivo=foto.caminho_arquivo,
                        latitude=foto.latitude,
                        longitude=foto.longitude,
                    )
                )

            trecho_items.append(
                TrechoListItemDTO(
                    id_trecho=trecho.id_trecho,
                    criado_em=trecho.criado_em,
                    foto_ids=trecho.foto_ids,
                    fotos=fotos,
                )
            )

        return TrechoListResponseDTO(items=trecho_items)
