import logging

from src.modules.analise.application.dtos.analise_dto import DeteccaoDTO, LaudoAnaliseDTO
from src.modules.analise.domain.repositories.i_analise_job_store import IAnaliseJobStore
from src.modules.analise.domain.repositories.i_deteccao_repository import IDeteccaoRepository
from src.modules.analise.domain.services.i_detector_defeitos import IDetectorDefeitos
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository

logger = logging.getLogger(__name__)


class ExecutarAnaliseUseCase:
    """Tarefa do worker: roda o detector, monta o laudo e atualiza o store."""

    def __init__(
        self,
        foto_repository: IFotoRepository,
        deteccao_repository: IDeteccaoRepository,
        detector: IDetectorDefeitos,
        job_store: IAnaliseJobStore,
    ):
        self.foto_repository = foto_repository
        self.deteccao_repository = deteccao_repository
        self.detector = detector
        self.job_store = job_store

    async def execute(self, job_id: str, inspecao_id: int) -> None:
        try:
            fotos = self.foto_repository.list_by_inspecao_id(inspecao_id)
            logger.info(
                "ExecutarAnaliseUseCase | job_id=%s inspecao_id=%s fotos=%d",
                job_id,
                inspecao_id,
                len(fotos),
            )

            deteccoes = self.detector.detect(fotos)
            salvas = self.deteccao_repository.replace_for_inspecao(inspecao_id, deteccoes)

            laudo = LaudoAnaliseDTO(
                inspecao_id=inspecao_id,
                deteccoes=[DeteccaoDTO.model_validate(d) for d in salvas],
                observacoes_gerais=None,
            )
            await self.job_store.set_completed(job_id, laudo.model_dump(mode="json"))

            logger.info(
                "Análise concluída | job_id=%s inspecao_id=%s deteccoes=%d",
                job_id,
                inspecao_id,
                len(laudo.deteccoes),
            )
        except Exception as exc:  # noqa: BLE001 - falha do job deve virar estado, não derrubar o worker
            logger.exception(
                "Falha ao executar análise job_id=%s inspecao_id=%s",
                job_id,
                inspecao_id,
            )
            await self.job_store.set_failed(job_id, str(exc))
