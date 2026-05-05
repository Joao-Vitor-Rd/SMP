from __future__ import annotations

import os
from dataclasses import dataclass
from io import BytesIO
from uuid import uuid4

from PIL import ExifTags, Image, UnidentifiedImageError

from src.modules.fotos.application.dtos.foto_dto import (
    FotoUploadFalhaDTO,
    FotoUploadSucessoDTO,
    ImagemUploadInputDTO,
    ProcessamentoFotosResponseDTO,
)
from src.modules.fotos.domain.entities.fotos import Foto
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository
from src.modules.fotos.domain.repositories.i_foto_storage import IFotoStorage


@dataclass(frozen=True)
class CoordenadasExif:
    latitude: float
    longitude: float


class Uc09UploadMultiplasImagensUseCase:
    def __init__(self, foto_repository: IFotoRepository, foto_storage: IFotoStorage):
        self.foto_repository = foto_repository
        self.foto_storage = foto_storage

    async def execute(self, files: list[ImagemUploadInputDTO]) -> ProcessamentoFotosResponseDTO:
        success: list[FotoUploadSucessoDTO] = []
        failed: list[FotoUploadFalhaDTO] = []

        for file in files:
            uploaded_image_url: str | None = None

            if not file.content:
                failed.append(
                    FotoUploadFalhaDTO(
                        filename=file.filename,
                        reason="Arquivo vazio",
                        image_url=None,
                    )
                )
                continue

            try:
                # 1. SEMPRE fazer upload da imagem primeiro
                extensao = os.path.splitext(file.filename)[1].lower()
                nome_arquivo = f"{uuid4().hex}{extensao}"
                content_type = file.content_type or "application/octet-stream"

                caminho_arquivo = self.foto_storage.save(
                    conteudo_arquivo=file.content,
                    nome_arquivo=nome_arquivo,
                    content_type=content_type,
                )
                uploaded_image_url = caminho_arquivo

                # 2. Tentar extrair coordenadas
                coordenadas = self._extrair_coordenadas(file.content)
                if coordenadas is None:
                    # Imagem foi salva, mas sem geolocalização
                    failed.append(
                        FotoUploadFalhaDTO(
                            filename=file.filename,
                            reason="Geolocalização não encontrada",
                            image_url=uploaded_image_url,
                        )
                    )
                    continue

                # 3. Salvar no banco de dados com coordenadas
                foto = Foto(
                    nome_original_arquivo=file.filename,
                    nome_aquivo=nome_arquivo,
                    caminho_arquivo=caminho_arquivo,
                    latitude=coordenadas.latitude,
                    longitude=coordenadas.longitude,
                    tipo_arquivo=content_type,
                )

                foto_salva = self.foto_repository.save(foto)
                success.append(
                    FotoUploadSucessoDTO(
                        id=foto_salva.id if foto_salva.id is not None else 0,
                        latitude=foto_salva.latitude if foto_salva.latitude is not None else coordenadas.latitude,
                        longitude=foto_salva.longitude if foto_salva.longitude is not None else coordenadas.longitude,
                        caminho_arquivo=foto_salva.caminho_arquivo,
                    )
                )
            except Exception as exc:
                failed.append(
                    FotoUploadFalhaDTO(
                        filename=file.filename,
                        reason=str(exc) or "Falha ao processar imagem",
                        image_url=uploaded_image_url,
                    )
                )

        return ProcessamentoFotosResponseDTO(success=success, failed=failed)

    def _extrair_coordenadas(self, conteudo_arquivo: bytes) -> CoordenadasExif | None:
        try:
            imagem = Image.open(BytesIO(conteudo_arquivo))
        except UnidentifiedImageError:
            return None

        exif = imagem.getexif()
        if not exif:
            return None

        gps_tag = next((tag for tag, name in ExifTags.TAGS.items() if name == "GPSInfo"), None)
        if gps_tag is None:
            return None

        gps_ifd = exif.get_ifd(gps_tag)
        if not gps_ifd:
            return None

        def _buscar_tag(nome: str) -> int | None:
            return next((tag for tag, tag_nome in ExifTags.GPSTAGS.items() if tag_nome == nome), None)

        lat_ref_tag = _buscar_tag("GPSLatitudeRef")
        lat_tag = _buscar_tag("GPSLatitude")
        lon_ref_tag = _buscar_tag("GPSLongitudeRef")
        lon_tag = _buscar_tag("GPSLongitude")

        if None in {lat_ref_tag, lat_tag, lon_ref_tag, lon_tag}:
            return None

        latitude_raw = gps_ifd.get(lat_tag)
        longitude_raw = gps_ifd.get(lon_tag)
        latitude_ref = gps_ifd.get(lat_ref_tag)
        longitude_ref = gps_ifd.get(lon_ref_tag)

        # Validar que os valores existem
        if latitude_raw is None or longitude_raw is None or latitude_ref is None or longitude_ref is None:
            return None

        try:
            latitude = self._converter_gps_para_decimal(latitude_raw)
            longitude = self._converter_gps_para_decimal(longitude_raw)
        except (TypeError, ValueError, IndexError):
            return None

        latitude_ref_str = latitude_ref.decode() if isinstance(latitude_ref, bytes) else str(latitude_ref)
        longitude_ref_str = longitude_ref.decode() if isinstance(longitude_ref, bytes) else str(longitude_ref)

        if latitude_ref_str.upper() == "S":
            latitude *= -1
        if longitude_ref_str.upper() == "W":
            longitude *= -1

        return CoordenadasExif(latitude=latitude, longitude=longitude)

    def _converter_gps_para_decimal(self, valor_gps) -> float:
        """
        Converte valor GPS de múltiplos formatos para decimal.
        PIL retorna GPS como tupla de Fraction ou valores numéricos.
        """
        try:
            # Se for tupla/lista, desempacotar como (graus, minutos, segundos)
            if isinstance(valor_gps, (tuple, list)):
                if len(valor_gps) >= 3:
                    graus = float(valor_gps[0])
                    minutos = float(valor_gps[1])
                    segundos = float(valor_gps[2])
                    return graus + (minutos / 60.0) + (segundos / 3600.0)
                else:
                    raise ValueError(f"GPS inválido: esperava 3 valores, recebeu {len(valor_gps)}")
            
            # Se for um Fraction object do PIL
            elif hasattr(valor_gps, 'numerator') and hasattr(valor_gps, 'denominator'):
                return float(valor_gps)
            
            # Se for um número simples
            else:
                return float(valor_gps)
        
        except (TypeError, ValueError, IndexError, ZeroDivisionError) as e:
            raise ValueError(f"Erro ao converter GPS '{valor_gps}': {e}")