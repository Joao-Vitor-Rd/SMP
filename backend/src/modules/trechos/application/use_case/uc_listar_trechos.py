import math
from datetime import datetime
from src.modules.trechos.application.dtos.trecho_dto import (
    TrechoFotoDTO,
    TrechoListItemDTO,
    PaginatedTrechoListResponseDTO,
)
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository


class UcListarTrechosUseCase:
    def __init__(self, trecho_repository: ITrechoRepository):
        self.trecho_repository = trecho_repository

    def execute(
        self,
        bbox_filter: TrechoBoundingBoxFilterDTO | None = None,
        cidade: str | None = None,
        uf: str | None = None,
        responsavel_tecnico: str | None = None,
        classificacao_qualidade: str | None = None,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
        responsavel_id: int | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> PaginatedTrechoListResponseDTO:
        res = self.trecho_repository.list_all(
            bbox_filter=bbox_filter,
            cidade=cidade,
            uf=uf,
            responsavel_tecnico=responsavel_tecnico,
            classificacao_qualidade=classificacao_qualidade,
            data_inicio=data_inicio,
            data_fim=data_fim,
            responsavel_id=responsavel_id,
            page=page,
            limit=limit,
        )
        if isinstance(res, tuple):
            trechos, total = res
        else:
            trechos = res
            total = len(trechos)

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
                    cidade=trecho.cidade,
                    uf=trecho.uf,
                    responsavel_tecnico=trecho.responsavel_tecnico,
                    classificacao_qualidade=trecho.classificacao_qualidade,
                    defeitos=trecho.defeitos,
                    responsavel_id=trecho.responsavel_id,
                )
            )

        total_pages = math.ceil(total / limit) if limit > 0 else 0
        has_next_page = page < total_pages
        has_previous_page = page > 1

        return PaginatedTrechoListResponseDTO(
            items=trecho_items,
            total=total,
            totalPages=total_pages,
            currentPage=page,
            hasNextPage=has_next_page,
            hasPreviousPage=has_previous_page,
        )
