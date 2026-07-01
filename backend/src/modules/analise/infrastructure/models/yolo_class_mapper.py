import logging
import unicodedata

from src.modules.analise.domain.entities.deteccao import DefeitoDNIT

logger = logging.getLogger(__name__)

# Classes RDD2022 (Roboflow) mapeadas para a taxonomia DNIT
_RAW_YOLO_TO_DNIT: dict[str, DefeitoDNIT] = {
    "1": DefeitoDNIT.TRINCAS_ISOLADAS,
    "4": DefeitoDNIT.PANELAS,
    "longitudinal crack": DefeitoDNIT.TRINCAS_ISOLADAS,
    "transverse crack": DefeitoDNIT.TRINCAS_ISOLADAS,
    "alligator crack": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "pothole": DefeitoDNIT.PANELAS,
}


def normalize_class_key(value: str) -> str:
    if not isinstance(value, str):
        value = str(value)
    cleaned = "".join(
        ch
        for ch in value
        if unicodedata.category(ch) not in ("Cf", "Cc", "Cn")
    )
    return cleaned.strip().lower()


def _build_yolo_to_dnit(raw: dict[str, DefeitoDNIT]) -> dict[str, DefeitoDNIT]:
    built: dict[str, DefeitoDNIT] = {}
    for raw_key, defeito in raw.items():
        key = normalize_class_key(raw_key)
        if not key:
            continue
        built[key] = defeito
    return built


class YoloClassMapper:
    def __init__(self, raw_mapping: dict[str, DefeitoDNIT] | None = None) -> None:
        source = raw_mapping if raw_mapping is not None else _RAW_YOLO_TO_DNIT
        self.yolo_to_dnit: dict[str, DefeitoDNIT] = _build_yolo_to_dnit(source)

        if not self.yolo_to_dnit:
            logger.critical("Mapeamento YOLO/DNIT vazio após inicialização")
        else:
            logger.info(
                "Mapeamento YOLO/DNIT carregado (%d classes)",
                len(self.yolo_to_dnit),
            )

    def map_yolo_class_to_dnit(self, yolo_class: str) -> DefeitoDNIT | None:
        if not self.yolo_to_dnit:
            return None

        lookup_key = normalize_class_key(yolo_class)
        return self.yolo_to_dnit.get(lookup_key)


_mapper = YoloClassMapper()
YOLO_TO_DNIT: dict[str, DefeitoDNIT] = _mapper.yolo_to_dnit


def map_yolo_class_to_dnit(yolo_class: str) -> DefeitoDNIT | None:
    return _mapper.map_yolo_class_to_dnit(yolo_class)


def severidade_from_confidence(confidence: float) -> str:
    if confidence >= 0.85:
        return "Alta"
    if confidence >= 0.70:
        return "Média"
    return "Baixa"
