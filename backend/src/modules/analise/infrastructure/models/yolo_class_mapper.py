import logging
import re
import unicodedata

from src.shared.enums.defeito_dnit_enum import DefeitoDNIT

logger = logging.getLogger(__name__)

# Mapeamento YOLO/RDD → taxonomia DNIT (5 classes). Desconhecidas retornam None.
_RAW_YOLO_TO_DNIT: dict[str, DefeitoDNIT] = {
    "pothole": DefeitoDNIT.PANELAS,
    "potholes": DefeitoDNIT.PANELAS,
    "hole": DefeitoDNIT.PANELAS,
    "holes": DefeitoDNIT.PANELAS,
    "buraco": DefeitoDNIT.PANELAS,
    "buracos": DefeitoDNIT.PANELAS,
    "panela": DefeitoDNIT.PANELAS,
    "panelas": DefeitoDNIT.PANELAS,
    "4": DefeitoDNIT.PANELAS,
    "d40": DefeitoDNIT.PANELAS,
    "d44": DefeitoDNIT.PANELAS,
    "crack": DefeitoDNIT.TRINCAS_ISOLADAS,
    "cracks": DefeitoDNIT.TRINCAS_ISOLADAS,
    "longitudinal crack": DefeitoDNIT.TRINCAS_ISOLADAS,
    "longitudinal cracks": DefeitoDNIT.TRINCAS_ISOLADAS,
    "transverse crack": DefeitoDNIT.TRINCAS_ISOLADAS,
    "transverse cracks": DefeitoDNIT.TRINCAS_ISOLADAS,
    "linear crack": DefeitoDNIT.TRINCAS_ISOLADAS,
    "1": DefeitoDNIT.TRINCAS_ISOLADAS,
    "0": DefeitoDNIT.TRINCAS_ISOLADAS,
    "d00": DefeitoDNIT.TRINCAS_ISOLADAS,
    "d10": DefeitoDNIT.TRINCAS_ISOLADAS,
    "alligator crack": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "alligator cracks": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "block crack": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "block cracks": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "crocodile crack": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "fatigue crack": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "2": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "d20": DefeitoDNIT.TRINCAS_INTERLIGADAS,
    "patch": DefeitoDNIT.REMENDOS,
    "patches": DefeitoDNIT.REMENDOS,
    "repair": DefeitoDNIT.REMENDOS,
    "repairs": DefeitoDNIT.REMENDOS,
    "remendo": DefeitoDNIT.REMENDOS,
    "remendos": DefeitoDNIT.REMENDOS,
    "3": DefeitoDNIT.REMENDOS,
    "rutting": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "raveling": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "ravelling": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "wear": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "surface wear": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "desgaste": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "desgaste superficial": DefeitoDNIT.DESGASTE_SUPERFICIAL,
    "abrasion": DefeitoDNIT.DESGASTE_SUPERFICIAL,
}


def normalize_class_key(value: str) -> str:
    if not isinstance(value, str):
        value = str(value)
    cleaned = "".join(
        ch
        for ch in value
        if unicodedata.category(ch) not in ("Cf", "Cc", "Cn")
    )
    cleaned = cleaned.replace("_", " ").replace("-", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    return cleaned


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
