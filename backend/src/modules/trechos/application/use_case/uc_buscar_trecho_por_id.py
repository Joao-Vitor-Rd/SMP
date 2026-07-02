from src.modules.trechos.application.dtos.trecho_dto import TrechoListItemDTO, TrechoFotoDTO
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository


class UcBuscarTrechoPorIdUseCase:
    def __init__(self, trecho_repository: ITrechoRepository):
        self.trecho_repository = trecho_repository

    def execute(self, id_trecho: str) -> TrechoListItemDTO:
        trecho = self.trecho_repository.find_by_id(id_trecho)
        if not trecho:
            raise ValueError("Trecho não encontrado")

        fotos = [
            TrechoFotoDTO(
                id=foto.id,
                caminho_arquivo=foto.caminho_arquivo,
                latitude=foto.latitude,
                longitude=foto.longitude,
            )
            for foto in trecho.fotos
            if foto.id is not None
        ]

        return TrechoListItemDTO(
            id_trecho=trecho.id_trecho,
            criado_em=trecho.criado_em,
            foto_ids=trecho.foto_ids,
            fotos=fotos,
            cidade=trecho.cidade,
            uf=trecho.uf,
            responsavel_tecnico=trecho.responsavel_tecnico,
            classificacao_qualidade=trecho.classificacao_qualidade,
            pci=trecho.pci,
            defeitos=trecho.defeitos,
            responsavel_id=trecho.responsavel_id,
        )
