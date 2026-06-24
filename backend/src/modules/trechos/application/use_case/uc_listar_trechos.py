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
        kwargs = {}
        if bbox_filter is not None:
            kwargs["bbox_filter"] = bbox_filter
        if cidade is not None:
            kwargs["cidade"] = cidade
        if uf is not None:
            kwargs["uf"] = uf
        if responsavel_tecnico is not None:
            kwargs["responsavel_tecnico"] = responsavel_tecnico
        if classificacao_qualidade is not None:
            kwargs["classificacao_qualidade"] = classificacao_qualidade
        if data_inicio is not None:
            kwargs["data_inicio"] = data_inicio
        if data_fim is not None:
            kwargs["data_fim"] = data_fim
        if responsavel_id is not None:
            kwargs["responsavel_id"] = responsavel_id
        if page is not None and page != 1:
            kwargs["page"] = page
        if limit is not None and limit != 10:
            kwargs["limit"] = limit

        res = self.trecho_repository.list_all(**kwargs)
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
                    id_trecho=getattr(trecho, "id_trecho", None),
                    criado_em=getattr(trecho, "criado_em", None),
                    foto_ids=getattr(trecho, "foto_ids", []),
                    fotos=fotos,
                    cidade=getattr(trecho, "cidade", None),
                    uf=getattr(trecho, "uf", None),
                    responsavel_tecnico=getattr(trecho, "responsavel_tecnico", None),
                    classificacao_qualidade=getattr(trecho, "classificacao_qualidade", None),
                    defeitos=getattr(trecho, "defeitos", None),
                    responsavel_id=getattr(trecho, "responsavel_id", None),
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
