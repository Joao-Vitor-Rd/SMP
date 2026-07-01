from src.modules.trechos.application.dtos.trecho_dto import TrechoListItemDTO, TrechoFotoDTO, TrechoUpdateDTO
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository


class UcAtualizarTrechoUseCase:
    def __init__(self, trecho_repository: ITrechoRepository):
        self.trecho_repository = trecho_repository

    def execute(self, id_trecho: str, dto: TrechoUpdateDTO) -> TrechoListItemDTO:
        trecho_existente = self.trecho_repository.find_by_id(id_trecho)
        if not trecho_existente:
            raise ValueError("Trecho não encontrado")

        update_fields = {}
        if dto.cidade is not None:
            update_fields["cidade"] = dto.cidade
        if dto.uf is not None:
            update_fields["uf"] = dto.uf
        if dto.responsavel_tecnico is not None:
            update_fields["responsavel_tecnico"] = dto.responsavel_tecnico
        if dto.classificacao_qualidade is not None:
            update_fields["classificacao_qualidade"] = dto.classificacao_qualidade
        if dto.defeitos is not None:
            update_fields["defeitos"] = dto.defeitos

        trecho_atualizado = self.trecho_repository.update(id_trecho, update_fields)
        if not trecho_atualizado:
            raise ValueError("Falha ao atualizar trecho")

        fotos = [
            TrechoFotoDTO(
                id=foto.id,
                caminho_arquivo=foto.caminho_arquivo,
                latitude=foto.latitude,
                longitude=foto.longitude,
            )
            for foto in trecho_atualizado.fotos
            if foto.id is not None
        ]

        return TrechoListItemDTO(
            id_trecho=trecho_atualizado.id_trecho,
            criado_em=trecho_atualizado.criado_em,
            foto_ids=trecho_atualizado.foto_ids,
            fotos=fotos,
            cidade=trecho_atualizado.cidade,
            uf=trecho_atualizado.uf,
            responsavel_tecnico=trecho_atualizado.responsavel_tecnico,
            classificacao_qualidade=trecho_atualizado.classificacao_qualidade,
            defeitos=trecho_atualizado.defeitos,
            responsavel_id=trecho_atualizado.responsavel_id,
        )
