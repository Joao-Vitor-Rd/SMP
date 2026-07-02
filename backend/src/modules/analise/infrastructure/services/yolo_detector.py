import io
import logging
import os
from typing import Any, List, Tuple

from inference_sdk import InferenceHTTPClient, InferenceConfiguration
from inference_sdk.http.errors import HTTPClientError
from PIL import Image

from src.modules.analise.domain.constants import MIN_DETECCAO_CONFIDENCE
from src.modules.analise.domain.entities.deteccao import Deteccao
from src.modules.analise.domain.services.i_detector_defeitos import IDetectorDefeitos
from src.modules.analise.infrastructure.models.yolo_class_mapper import (
    map_yolo_class_to_dnit,
    severidade_from_confidence,
)
from src.modules.analise.infrastructure.services.yolo_tiling import (
    TileDetection,
    iter_tiles,
    merge_tile_detections,
    suppress_overlapping_detections,
    tile_grid_for_size,
)
from src.modules.fotos.domain.entities.fotos import Foto
from src.modules.fotos.domain.repositories.i_foto_storage import IFotoStorage

logger = logging.getLogger(__name__)

DEFAULT_ROBOFLOW_API_URL = "https://serverless.roboflow.com"
DEFAULT_ROBOFLOW_MODEL_ID = "rdd2022-22jrg/1"


class YoloDetector(IDetectorDefeitos):
    """Detector via Roboflow Serverless API (modelo RDD2022)."""

    def __init__(
        self,
        storage: IFotoStorage,
        _model_path: str | None = None,
        conf: float = MIN_DETECCAO_CONFIDENCE,
        iou: float = 0.45,
    ):
        self.storage = storage
        self.iou = iou
        self.conf = max(conf, MIN_DETECCAO_CONFIDENCE)
        env_model_id = os.getenv("ROBOFLOW_MODEL_ID")
        self.model_id = env_model_id or DEFAULT_ROBOFLOW_MODEL_ID
        api_url = os.getenv("ROBOFLOW_API_URL", DEFAULT_ROBOFLOW_API_URL)
        api_key = (os.getenv("ROBOFLOW_API_KEY") or "").strip()
        if not api_key:
            raise ValueError(
                "ROBOFLOW_API_KEY não definida. Configure a chave da Roboflow no .env."
            )

        if env_model_id and env_model_id != DEFAULT_ROBOFLOW_MODEL_ID:
            logger.warning(
                "ROBOFLOW_MODEL_ID no .env (%s) difere do padrão RDD2022 (%s)",
                env_model_id,
                DEFAULT_ROBOFLOW_MODEL_ID,
            )

        self._client = InferenceHTTPClient(api_url=api_url, api_key=api_key)
        self._client.configure(
            InferenceConfiguration(confidence_threshold=self.conf),
        )

    def detect(self, fotos: List[Foto]) -> List[Deteccao]:
        deteccoes, _ = self._run_batch(fotos)
        return deteccoes

    def _run_batch(self, fotos: List[Foto]) -> Tuple[List[Deteccao], int]:
        deteccoes: List[Deteccao] = []
        raw_boxes_total = 0
        for foto in fotos:
            foto_deteccoes, raw_count = self._detect_foto(foto)
            deteccoes.extend(foto_deteccoes)
            raw_boxes_total += raw_count
        return deteccoes, raw_boxes_total

    def _detect_foto(self, foto: Foto) -> Tuple[List[Deteccao], int]:
        image_bytes = self.storage.get_bytes(foto.caminho_arquivo)

        with Image.open(io.BytesIO(image_bytes)) as img:
            img = img.convert("RGB")
            width, height = img.size
            if height == 0 or width == 0:
                logger.warning(
                    "Imagem com dimensão zero foto_id=%s — inferência abortada",
                    foto.id,
                )
                return [], 0

            cols, rows = tile_grid_for_size(width, height)

            raw_candidates: List[TileDetection] = []
            raw_boxes_total = 0

            for tile in iter_tiles(img, cols, rows):
                tile_candidates, tile_box_count = self._infer_tile(
                    tile.image,
                    offset_x=tile.offset_x,
                    offset_y=tile.offset_y,
                    foto_id=foto.id,
                )
                raw_candidates.extend(tile_candidates)
                raw_boxes_total += tile_box_count

        merged = merge_tile_detections(raw_candidates, self.iou)
        deteccoes = self._candidates_to_deteccoes(merged, foto.id)
        return deteccoes, raw_boxes_total

    def _infer_tile(
        self,
        tile_image: Image.Image,
        *,
        offset_x: int,
        offset_y: int,
        foto_id: int | None = None,
    ) -> Tuple[List[TileDetection], int]:
        try:
            resultado = self._client.infer(tile_image, model_id=self.model_id)
        except HTTPClientError as exc:
            logger.error(
                "Falha na API Roboflow | foto_id=%s | model_id=%s | offset=(%s,%s) | "
                "erro=%s",
                foto_id,
                self.model_id,
                offset_x,
                offset_y,
                exc,
            )
            return [], 0
        except Exception:
            logger.exception(
                "Erro inesperado na inferência Roboflow | foto_id=%s | model_id=%s | "
                "offset=(%s,%s)",
                foto_id,
                self.model_id,
                offset_x,
                offset_y,
            )
            return [], 0

        api_error = self._extract_roboflow_error(resultado)
        if api_error:
            logger.error(
                "Erro retornado pela Roboflow | foto_id=%s | model_id=%s | detalhe=%s",
                foto_id,
                self.model_id,
                api_error,
            )
            return [], 0

        return self._parse_roboflow_response(
            resultado,
            offset_x=offset_x,
            offset_y=offset_y,
            foto_id=foto_id,
            iou_threshold=self.iou,
        )

    @staticmethod
    def _extract_roboflow_error(response: Any) -> str | None:
        payloads: list[Any]
        if isinstance(response, list):
            payloads = response
        elif isinstance(response, dict):
            payloads = [response]
        else:
            return f"formato de resposta inesperado: {type(response)!r}"

        for payload in payloads:
            if not isinstance(payload, dict):
                continue
            for key in ("error", "message", "detail"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    lowered = value.lower()
                    if any(
                        token in lowered
                        for token in (
                            "unauthorized",
                            "forbidden",
                            "api key",
                            "not found",
                            "model",
                            "permission",
                        )
                    ):
                        return value
                    if key == "error":
                        return value
        return None

    def _parse_roboflow_response(
        self,
        response: Any,
        *,
        offset_x: int,
        offset_y: int,
        foto_id: int | None = None,
        iou_threshold: float = 0.45,
    ) -> Tuple[List[TileDetection], int]:
        if isinstance(response, list):
            payload = response[0] if response else {}
        elif isinstance(response, dict):
            payload = response
        else:
            return [], 0

        predictions = payload.get("predictions") or []

        candidates: List[TileDetection] = []
        below_threshold = 0
        for index, prediction in enumerate(predictions):
            confidence = round(float(prediction.get("confidence", 0)), 4)
            class_name = str(prediction.get("class") or prediction.get("class_id", ""))

            if confidence < MIN_DETECCAO_CONFIDENCE:
                below_threshold += 1
                continue
            center_x = float(prediction.get("x", 0))
            center_y = float(prediction.get("y", 0))
            box_width = float(prediction.get("width", 0))
            box_height = float(prediction.get("height", 0))

            raw_class_id = prediction.get("class_id")
            if raw_class_id is not None:
                cls_id = int(raw_class_id)
            elif class_name.isdigit():
                cls_id = int(class_name)
            else:
                cls_id = index

            candidates.append(
                TileDetection(
                    cls_id=cls_id,
                    class_name=class_name,
                    confidence=confidence,
                    x1=center_x - box_width / 2 + offset_x,
                    y1=center_y - box_height / 2 + offset_y,
                    x2=center_x + box_width / 2 + offset_x,
                    y2=center_y + box_height / 2 + offset_y,
                )
            )

        candidates = suppress_overlapping_detections(candidates, iou_threshold)

        if predictions and not candidates:
            logger.warning(
                "Roboflow: nenhuma detecção acima de conf=%s | foto_id=%s | "
                "predictions=%d descartadas=%d",
                MIN_DETECCAO_CONFIDENCE,
                foto_id,
                len(predictions),
                below_threshold,
            )

        return candidates, len(predictions)

    def _candidates_to_deteccoes(
        self,
        candidates: List[TileDetection],
        foto_id: int | None,
    ) -> List[Deteccao]:
        deteccoes: List[Deteccao] = []
        for candidate in candidates:
            defeito = map_yolo_class_to_dnit(candidate.class_name)
            if defeito is None:
                continue

            deteccao = Deteccao(
                defeito=defeito,
                confidence_score=candidate.confidence,
                severidade=severidade_from_confidence(candidate.confidence),
                observacao=None,
                imagem_id=foto_id,
                revisado_manualmente=False,
            )
            deteccoes.append(deteccao)
        return deteccoes
