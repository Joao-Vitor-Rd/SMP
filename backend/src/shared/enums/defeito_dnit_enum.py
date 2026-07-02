from enum import Enum


class DefeitoDNIT(str, Enum):
    """Taxonomia oficial DNIT 005/2003-TER — exatamente 5 classificações."""

    PANELAS = "Panelas (buracos)"
    TRINCAS_ISOLADAS = "Trincas isoladas"
    TRINCAS_INTERLIGADAS = "Trincas interligadas"
    REMENDOS = "Remendos"
    DESGASTE_SUPERFICIAL = "Desgaste superficial"


DEFEITOS_DNIT_OFICIAIS: frozenset[str] = frozenset(item.value for item in DefeitoDNIT)

# Aliases legados aceitos na entrada (normalizados para o valor oficial do enum).
_LEGACY_DEFEITO_ALIASES: dict[str, DefeitoDNIT] = {
    "panelas": DefeitoDNIT.PANELAS,
    "buracos": DefeitoDNIT.PANELAS,
    "panela": DefeitoDNIT.PANELAS,
    "pothole": DefeitoDNIT.PANELAS,
    "potholes": DefeitoDNIT.PANELAS,
}


def parse_defeito_dnit(value: object) -> DefeitoDNIT:
    if isinstance(value, DefeitoDNIT):
        return value

    if not isinstance(value, str):
        raise ValueError(f"Defeito DNIT inválido: {value!r}")

    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Defeito DNIT não pode ser vazio.")

    if cleaned in DEFEITOS_DNIT_OFICIAIS:
        return DefeitoDNIT(cleaned)

    alias_key = cleaned.lower()
    if alias_key in _LEGACY_DEFEITO_ALIASES:
        return _LEGACY_DEFEITO_ALIASES[alias_key]

    raise ValueError(
        "Defeito fora da taxonomia DNIT 005/2003-TER. "
        f"Valores aceitos: {', '.join(sorted(DEFEITOS_DNIT_OFICIAIS))}."
    )


def is_defeito_dnit(value: str) -> bool:
    try:
        parse_defeito_dnit(value)
        return True
    except ValueError:
        return False
