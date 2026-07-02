from src.modules.trechos.application.dtos.laudo_dto import (
    LaudoPublicacaoCreateDTO,
    LaudoPublicadoDTO,
)
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository
from src.modules.analise.domain.repositories.i_deteccao_repository import IDeteccaoRepository
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository
from src.modules.analise.application.dtos.analise_dto import DeteccaoDTO


class PublicarLaudoUseCase:
    def __init__(
        self,
        laudo_repository: ILaudoRepository,
        deteccao_repository: IDeteccaoRepository,
        foto_repository: IFotoRepository,
        trecho_repository: ITrechoRepository,
    ):
        self.laudo_repository = laudo_repository
        self.deteccao_repository = deteccao_repository
        self.foto_repository = foto_repository
        self.trecho_repository = trecho_repository

    @staticmethod
    def _classificacao_por_pci(pci: float) -> str:
        return f"{pci:.1f}"

    def execute(self, laudo_id: int, dto: LaudoPublicacaoCreateDTO) -> LaudoPublicadoDTO:
        resumo_publicacao = dto.resumo.model_dump()
        publicado = self.laudo_repository.publicar(laudo_id, resumo_publicacao)
        if publicado is None:
            raise LookupError(f"Laudo {laudo_id} não encontrado.")

        deteccoes = self.deteccao_repository.list_by_inspecao(laudo_id)

        trecho_ids = {
            foto.trecho_id
            for foto in self.foto_repository.list_by_inspecao_id(laudo_id)
            if foto.trecho_id
        }
        classificacao_qualidade = self._classificacao_por_pci(float(resumo_publicacao["pci"]))

        for trecho_id in trecho_ids:
            self.trecho_repository.update(
                trecho_id,
                {
                    "classificacao_qualidade": classificacao_qualidade,
                },
            )

        return LaudoPublicadoDTO(
            id=publicado["id"],
            inspecao_id=laudo_id,
            publicado_em=publicado["publicado_em"],
            resumo=publicado["resumo"],
            deteccoes=[DeteccaoDTO.model_validate(d) for d in deteccoes],
        )
