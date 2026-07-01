"""Tiling e NMS para inferência YOLO em imagens de alta resolução."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator, List, Tuple

import torch
from PIL import Image
from torchvision.ops import nms

# Área mínima (px²) para ativar tiling — imagens abaixo disso usam passagem única
_TILE_AREA_2X2 = 4_000_000
_TILE_AREA_3X3 = 9_000_000


@dataclass(frozen=True)
class TileSlice:
    image: Image.Image
    offset_x: int
    offset_y: int


@dataclass
class TileDetection:
    cls_id: int
    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


def _class_group_key(detection: TileDetection) -> str:
    return detection.class_name.strip().lower()


def suppress_overlapping_detections(
    detections: List[TileDetection],
    iou_threshold: float,
) -> List[TileDetection]:
    """NMS por classe: caixas sobrepostas mantêm apenas a maior confiança."""
    if len(detections) <= 1:
        return detections

    by_class: dict[str, List[TileDetection]] = {}
    for det in detections:
        by_class.setdefault(_class_group_key(det), []).append(det)

    kept: List[TileDetection] = []
    for group in by_class.values():
        group.sort(key=lambda item: item.confidence, reverse=True)
        boxes = torch.tensor(
            [[item.x1, item.y1, item.x2, item.y2] for item in group],
            dtype=torch.float32,
        )
        scores = torch.tensor([item.confidence for item in group], dtype=torch.float32)
        keep_indices = nms(boxes, scores, iou_threshold).tolist()
        kept.extend(group[index] for index in keep_indices)

    kept.sort(key=lambda item: item.confidence, reverse=True)
    return kept


def tile_grid_for_size(width: int, height: int) -> Tuple[int, int]:
    """Retorna (colunas, linhas) da grade de tiles."""
    area = width * height
    if area >= _TILE_AREA_3X3:
        return 3, 3
    if area >= _TILE_AREA_2X2:
        return 2, 2
    return 1, 1


def iter_tiles(image: Image.Image, cols: int, rows: int) -> Iterator[TileSlice]:
    """Divide a imagem em tiles contíguos cobrindo 100% da resolução original."""
    width, height = image.size
    for row in range(rows):
        for col in range(cols):
            left = col * width // cols
            top = row * height // rows
            right = (col + 1) * width // cols if col < cols - 1 else width
            bottom = (row + 1) * height // rows if row < rows - 1 else height
            yield TileSlice(
                image=image.crop((left, top, right, bottom)),
                offset_x=left,
                offset_y=top,
            )


def merge_tile_detections(detections: List[TileDetection], iou_threshold: float) -> List[TileDetection]:
    """Combina detecções de múltiplos tiles removendo duplicatas via NMS por classe."""
    return suppress_overlapping_detections(detections, iou_threshold)
