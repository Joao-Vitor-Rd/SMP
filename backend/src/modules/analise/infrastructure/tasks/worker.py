import logging
import os

import src.shared.infrastructure.orm_registry  # noqa: F401 — registra mappers ORM

from src.modules.analise.application.use_case.uc_executar_analise import ExecutarAnaliseUseCase
from src.modules.analise.domain.constants import MIN_DETECCAO_CONFIDENCE
from src.modules.analise.domain.services.i_detector_defeitos import IDetectorDefeitos
from src.modules.analise.infrastructure.repositories.deteccao_repository import DeteccaoRepository
from src.modules.analise.infrastructure.services.detector_defeitos_stub import DetectorDefeitosStub
from src.modules.analise.infrastructure.stores.redis_analise_job_store import RedisAnaliseJobStore
from src.modules.analise.infrastructure.tasks.arq_pool import get_redis_settings
from src.modules.fotos.infrastructure.repositories.foto_repository import FotoRepository
from src.modules.fotos.infrastructure.services.minio_client import build_foto_storage
from src.shared.infrastructure.db import SessionLocal

logger = logging.getLogger(__name__)

MODOS_DETECTOR_VALIDOS = frozenset({"yolo", "stub"})

_yolo_detector_instance: IDetectorDefeitos | None = None


def _resolver_modo_detector() -> str:
    raw = os.getenv("DETECTOR_DEFEITOS", "").strip().lower()

    if not raw:
        logger.warning(
            "DETECTOR_DEFEITOS não definido; usando 'yolo' no worker. "
            "Defina DETECTOR_DEFEITOS=yolo ou DETECTOR_DEFEITOS=stub no .env."
        )
        return "yolo"

    if raw not in MODOS_DETECTOR_VALIDOS:
        raise ValueError(
            f"DETECTOR_DEFEITOS inválido: '{raw}'. "
            f"Valores aceitos: {', '.join(sorted(MODOS_DETECTOR_VALIDOS))}."
        )

    return raw


def _get_yolo_detector() -> IDetectorDefeitos:
    global _yolo_detector_instance
    if _yolo_detector_instance is None:
        from src.modules.analise.infrastructure.services.yolo_detector import YoloDetector

        logger.info(
            "Inicializando YoloDetector (Roboflow) | model_id=%s | conf=%s | iou=%s",
            os.getenv("ROBOFLOW_MODEL_ID", "rdd2022-22jrg/1"),
            os.getenv("YOLO_CONF_THRESHOLD", str(MIN_DETECCAO_CONFIDENCE)),
            os.getenv("YOLO_IOU_THRESHOLD", "0.45"),
        )
        _yolo_detector_instance = YoloDetector(
            storage=build_foto_storage(),
            conf=float(os.getenv("YOLO_CONF_THRESHOLD", str(MIN_DETECCAO_CONFIDENCE))),
            iou=float(os.getenv("YOLO_IOU_THRESHOLD", "0.45")),
        )
    return _yolo_detector_instance


def build_detector() -> IDetectorDefeitos:
    modo = _resolver_modo_detector()
    if modo == "yolo":
        return _get_yolo_detector()
    return DetectorDefeitosStub()


async def warmup_detector(ctx) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    modo = _resolver_modo_detector()
    logger.info("Worker startup | DETECTOR_DEFEITOS=%r | modo=%r", os.getenv("DETECTOR_DEFEITOS"), modo)

    if modo == "yolo":
        logger.info("Inicializando detector Roboflow...")
        _get_yolo_detector()
        logger.info("Detector Roboflow pronto")


async def cleanup_detector(ctx) -> None:
    global _yolo_detector_instance
    _yolo_detector_instance = None


async def executar_analise_task(ctx, job_id: str, inspecao_id: int) -> None:
    session = SessionLocal()
    try:
        detector = build_detector()
        logger.info(
            "Executando análise job_id=%s inspecao_id=%s com detector=%s",
            job_id,
            inspecao_id,
            type(detector).__name__,
        )
        use_case = ExecutarAnaliseUseCase(
            foto_repository=FotoRepository(session),
            deteccao_repository=DeteccaoRepository(session),
            detector=detector,
            job_store=RedisAnaliseJobStore(),
        )
        await use_case.execute(job_id, inspecao_id)
    finally:
        session.close()


class WorkerSettings:
    functions = [executar_analise_task]
    redis_settings = get_redis_settings()
    on_startup = warmup_detector
    on_shutdown = cleanup_detector
