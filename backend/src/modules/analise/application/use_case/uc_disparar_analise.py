import uuid

from src.modules.analise.domain.repositories.i_analise_job_store import IAnaliseJobStore
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository


class DispararAnaliseUseCase:
    """Dispara a análise quando o laudo existe e há fotos vinculadas."""

    def __init__(
        self,
        laudo_repository: ILaudoRepository,
        foto_repository: IFotoRepository,
        job_store: IAnaliseJobStore,
        queue,
    ):
        self.laudo_repository = laudo_repository
        self.foto_repository = foto_repository
        self.job_store = job_store
        self.queue = queue

    async def execute(self, inspecao_id: int) -> str:
        laudo = self.laudo_repository.find_by_id(inspecao_id)
        if laudo is None:
            raise LookupError(f"Inspeção {inspecao_id} não encontrada.")

        fotos = self.foto_repository.list_by_inspecao_id(inspecao_id)
        if not fotos:
            raise ValueError(
                "Nenhuma foto vinculada a esta inspeção (upload com inspecao_id válido)."
            )

        job_id = uuid.uuid4().hex
        await self.job_store.set_pending(job_id, inspecao_id)
        await self.queue.enqueue_job("executar_analise_task", job_id, inspecao_id)
        return job_id
