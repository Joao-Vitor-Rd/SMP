from typing import List, Optional
from pydantic import BaseModel

from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository


class TrechoRelacionadoDTO(BaseModel):
    id_trecho: str
    cidade: Optional[str] = None
    uf: Optional[str] = None
    responsavel_tecnico: Optional[str] = None
    classificacao_qualidade: Optional[str] = None
    # IDs de todos os laudos (incluindo o consultado) que compartilham fotos
    # com este mesmo trecho — usado pelo frontend para escopar histórico e
    # comparativo por trecho, em vez de mostrar todo o sistema.
    laudo_ids_mesmo_trecho: List[int] = []


class BuscarTrechoPorLaudoUseCase:
    """Descobre a qual Trecho um laudo pertence, e quais outros laudos
    pertencem ao mesmo trecho.

    LIMITAÇÃO CONHECIDA: não existe FK direta laudo->trecho no schema atual
    (LaudoORM não tem trecho_id, TrechoORM não tem laudo_id). A ligação é
    inferida via a tabela de Fotos: cada foto pertence a UM laudo
    (inspecao_id, usado no módulo de análise) e, depois de processada, a UM
    trecho (trecho_id, gravado em TrechoRepository.create_with_fotos).
    Cruzando os foto_ids de cada lado, dá pra inferir a relação.

    CUSTO: esta implementação faz uma varredura O(n_laudos) — para cada
    laudo do sistema, busca suas fotos e compara com as fotos do trecho.
    Funciona corretamente para o volume atual, mas não escala bem. O ideal
    a médio prazo é adicionar uma coluna `trecho_id` em `laudo` (populada no
    momento da criação/associação de fotos) para virar um JOIN direto no
    banco em vez de comparação em Python.
    """

    def __init__(
        self,
        foto_repository: IFotoRepository,
        trecho_repository: ITrechoRepository,
        laudo_repository: ILaudoRepository,
    ):
        self.foto_repository = foto_repository
        self.trecho_repository = trecho_repository
        self.laudo_repository = laudo_repository

    def _foto_ids_do_laudo(self, laudo_id: int) -> set:
        fotos = self.foto_repository.list_by_inspecao_id(laudo_id)
        return {f.id for f in fotos if getattr(f, "id", None) is not None}

    def execute(self, laudo_id: int) -> Optional[TrechoRelacionadoDTO]:
        foto_ids_laudo = self._foto_ids_do_laudo(laudo_id)
        if not foto_ids_laudo:
            return None

        trechos, _ = self.trecho_repository.list_all()

        trecho_encontrado = None
        for trecho in trechos:
            if foto_ids_laudo.intersection(trecho.foto_ids or []):
                trecho_encontrado = trecho
                break

        if trecho_encontrado is None:
            return None

        todos_laudos = self.laudo_repository.list_all()
        laudo_ids_mesmo_trecho = [laudo_id]
        for laudo in todos_laudos:
            if laudo.id is None or laudo.id == laudo_id:
                continue
            foto_ids_outro = self._foto_ids_do_laudo(laudo.id)
            if foto_ids_outro.intersection(trecho_encontrado.foto_ids or []):
                laudo_ids_mesmo_trecho.append(laudo.id)

        return TrechoRelacionadoDTO(
            id_trecho=trecho_encontrado.id_trecho,
            cidade=trecho_encontrado.cidade,
            uf=trecho_encontrado.uf,
            responsavel_tecnico=trecho_encontrado.responsavel_tecnico,
            classificacao_qualidade=trecho_encontrado.classificacao_qualidade,
            laudo_ids_mesmo_trecho=laudo_ids_mesmo_trecho,
        )