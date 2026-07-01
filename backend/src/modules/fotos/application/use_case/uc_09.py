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
    TrechoCriadoDTO,
)
from src.modules.fotos.domain.entities.fotos import Foto
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository
from src.modules.fotos.domain.repositories.i_foto_storage import IFotoStorage
from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository


@dataclass(frozen=True)
class CoordenadasExif:
    latitude: float
    longitude: float


class Uc09UploadMultiplasImagensUseCase:
    # Formatos permitidos
    EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".tiff", ".tif"}
    # Tamanho máximo: 50 MB
    TAMANHO_MAXIMO_MB = 50
    TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024
    def __init__(
        self,
        foto_repository: IFotoRepository,
        foto_storage: IFotoStorage,
        trecho_repository: ITrechoRepository,
        laudo_repository: ILaudoRepository | None = None,
    ):
        self.foto_repository = foto_repository
        self.foto_storage = foto_storage
        self.trecho_repository = trecho_repository
        self.laudo_repository = laudo_repository

    async def execute(
        self,
        files: list[ImagemUploadInputDTO],
        responsavel_id: int | None = None,
        inspecao_id: int | None = None,
    ) -> ProcessamentoFotosResponseDTO:
        if inspecao_id is not None:
            if self.laudo_repository is None:
                raise ValueError("Repositório de laudo indisponível para validar a inspeção.")
            laudo = self.laudo_repository.find_by_id(inspecao_id)
            if laudo is None:
                raise LookupError(f"Inspeção {inspecao_id} não encontrada.")

        success: list[FotoUploadSucessoDTO] = []
        failed: list[FotoUploadFalhaDTO] = []
        foto_ids_processadas: list[int] = []

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

            # Validar formato e tamanho
            erro_validacao = self._validar_arquivo(file.filename, file.content)
            if erro_validacao:
                failed.append(
                    FotoUploadFalhaDTO(
                        filename=file.filename,
                        reason=erro_validacao,
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
                    # Persiste a foto sem coordenadas para permitir georreferenciamento manual.
                    foto_sem_gps = Foto(
                        nome_original_arquivo=file.filename,
                        nome_aquivo=nome_arquivo,
                        caminho_arquivo=caminho_arquivo,
                        latitude=None,
                        longitude=None,
                        laudo_id=inspecao_id,
                        tipo_arquivo=content_type,
                    )
                    foto_salva = self.foto_repository.save(foto_sem_gps)
                    if foto_salva.id is not None:
                        foto_ids_processadas.append(foto_salva.id)

                    presigned_url = self.foto_storage.get_presigned_url(
                        caminho_arquivo=foto_salva.caminho_arquivo
                    )
                    failed.append(
                        FotoUploadFalhaDTO(
                            filename=file.filename,
                            reason="Foto sem localização (EXIF GPS não encontrado)",
                            image_url=presigned_url,
                            id=foto_salva.id,
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
                    laudo_id=inspecao_id,
                    tipo_arquivo=content_type,
                )

                foto_salva = self.foto_repository.save(foto)
                if foto_salva.id is not None:
                    foto_ids_processadas.append(foto_salva.id)
                
                # 4. Gerar presigned URL para retorno seguro
                presigned_url = self.foto_storage.get_presigned_url(
                    caminho_arquivo=foto_salva.caminho_arquivo
                )
                
                success.append(
                    FotoUploadSucessoDTO(
                        id=foto_salva.id if foto_salva.id is not None else 0,
                        filename=file.filename,
                        latitude=foto_salva.latitude if foto_salva.latitude is not None else coordenadas.latitude,
                        longitude=foto_salva.longitude if foto_salva.longitude is not None else coordenadas.longitude,
                        caminho_arquivo=presigned_url,
                        trecho_id=foto_salva.trecho_id,
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

        trecho_criado: TrechoCriadoDTO | None = None
        if foto_ids_processadas:
            if responsavel_id is not None:
                trecho = self.trecho_repository.create_with_fotos(foto_ids_processadas, responsavel_id=responsavel_id)
            else:
                trecho = self.trecho_repository.create_with_fotos(foto_ids_processadas)
            trecho_criado = TrechoCriadoDTO(
                id_trecho=trecho.id_trecho,
                foto_ids=trecho.foto_ids,
            )

            trecho_por_foto = {foto_id: trecho.id_trecho for foto_id in trecho.foto_ids}
            success = [
                item.model_copy(update={"trecho_id": trecho_por_foto.get(item.id)})
                for item in success
            ]

        if inspecao_id is not None and foto_ids_processadas:
            self.foto_repository.associate_to_laudo(foto_ids_processadas, inspecao_id)

        return ProcessamentoFotosResponseDTO(success=success, failed=failed, trecho=trecho_criado)

    def _validar_arquivo(self, filename: str, conteudo: bytes) -> str | None:
        """
        Valida o arquivo verificando formato e tamanho.
        Retorna mensagem de erro se inválido, None se válido.
        """
        # Verificar extensão
        extensao = os.path.splitext(filename)[1].lower()
        if extensao not in self.EXTENSOES_PERMITIDAS:
            formatos_permitidos = ", ".join(self.EXTENSOES_PERMITIDAS)
            return f"Formato inválido. Formatos permitidos: {formatos_permitidos}"
        
        # Verificar tamanho
        tamanho_bytes = len(conteudo)
        if tamanho_bytes > self.TAMANHO_MAXIMO_BYTES:
            tamanho_mb = tamanho_bytes / (1024 * 1024)
            return f"Arquivo muito grande ({tamanho_mb:.2f} MB). Tamanho máximo: {self.TAMANHO_MAXIMO_MB} MB"
        
        return None

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