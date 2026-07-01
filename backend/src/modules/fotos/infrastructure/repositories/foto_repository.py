from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from src.modules.fotos.domain.entities.fotos import Foto, fotosORM
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository
import logging

logger = logging.getLogger(__name__)


class FotoRepository(IFotoRepository):
	def __init__(self, session: Session):
		self.session = session

	def save(self, foto: Foto) -> Foto:
		foto_orm = fotosORM(
			nome_original_arquivo=foto.nome_original_arquivo,
			nome_aquivo=foto.nome_aquivo,
			caminho_arquivo=foto.caminho_arquivo,
			latitude=foto.latitude,
			longitude=foto.longitude,
			trecho_id=foto.trecho_id,
			laudo_id=foto.laudo_id,
			tipo_arquivo=foto.tipo_arquivo,
		)

		self.session.add(foto_orm)
		try:
			self.session.commit()
		except IntegrityError as exc:
			self.session.rollback()
			raise ValueError("Erro ao salvar a foto no banco de dados") from exc

		self.session.refresh(foto_orm)
		return Foto.model_validate(foto_orm)

	def list_all(self) -> list[Foto]:
		fotos = self.session.query(fotosORM).order_by(fotosORM.id.asc()).all()
		return [Foto.model_validate(foto_orm) for foto_orm in fotos]

	def list_by_inspecao_id(self, inspecao_id: int) -> list[Foto]:
		fotos = (
			self.session.query(fotosORM)
			.filter(fotosORM.laudo_id == inspecao_id)
			.order_by(fotosORM.id.asc())
			.all()
		)
		return [Foto.model_validate(foto_orm) for foto_orm in fotos]

	def find_by_id(self, foto_id: int) -> Foto | None:
		foto_orm = self.session.query(fotosORM).filter(fotosORM.id == foto_id).first()
		return Foto.model_validate(foto_orm) if foto_orm else None

	def update_localizacao(self, foto_id: int, latitude: float, longitude: float) -> Foto | None:
		foto_orm = self.session.query(fotosORM).filter(fotosORM.id == foto_id).first()
		if foto_orm is None:
			return None

		foto_orm.latitude = latitude
		foto_orm.longitude = longitude
		try:
			self.session.commit()
		except SQLAlchemyError as exc:
			self.session.rollback()
			raise exc
		self.session.refresh(foto_orm)
		return Foto.model_validate(foto_orm)

	def associate_to_trecho(self, foto_ids: list[int], trecho_id: str) -> None:
		if not foto_ids:
			return

		self.session.query(fotosORM).filter(fotosORM.id.in_(foto_ids)).update(
			{fotosORM.trecho_id: trecho_id},
			synchronize_session=False,
		)
		self.session.commit()

	def associate_to_laudo(self, foto_ids: list[int], laudo_id: int) -> None:
		if not foto_ids:
			return

		self.session.query(fotosORM).filter(fotosORM.id.in_(foto_ids)).update(
			{fotosORM.laudo_id: laudo_id},
			synchronize_session=False,
		)
		self.session.commit()

	def find_by_path_or_name(self, identifier: str) -> Foto | None:
			# busca por caminho armazenado no MinIO ou pelo nome gerado/nome original do arquivo
			from sqlalchemy import or_, text

			candidate = (identifier or "").strip()
			logger.info("find_by_path_or_name called with identifier=%s (normalized start)", identifier)

			# Normalizar: se for URL pública, extrair bucket/objeto
			if candidate.startswith("http://") or candidate.startswith("https://"):
				parts = candidate.split("/", 3)
				if len(parts) >= 4:
					candidate = parts[3]

			candidate = candidate.strip()
			if not candidate:
				logger.debug("find_by_path_or_name: empty candidate after normalization")
				return None

			logger.debug("find_by_path_or_name: searching for candidate=%s", candidate)

			# 1) tentativas diretas: caminho, nome_aquivo, nome_original_arquivo
			like_expr = f"%{candidate}"

			foto_orm = (
				self.session.query(fotosORM)
				.filter(
					or_(
						fotosORM.caminho_arquivo == candidate,
						fotosORM.caminho_arquivo.like(like_expr),
						fotosORM.nome_aquivo == candidate,
						fotosORM.nome_original_arquivo == candidate,
					)
				)
				.first()
			)

			if foto_orm:
				logger.info("find_by_path_or_name: found foto id=%s for candidate=%s", getattr(foto_orm, 'id', None), candidate)
				logger.debug("find_by_path_or_name: found foto id=%s for candidate=%s", getattr(foto_orm, 'id', None), candidate)
				return Foto.model_validate(foto_orm)

			# 2) se client gerou id composto como 'originalName-<size>-<lastModified>-<random>',
			#    tentar extrair prefix antes do primeiro '-' e comparar com nome_original_arquivo
			if "-" in candidate and "." in candidate:
				prefix = candidate.split("-", 1)[0]
				if prefix:
					foto_orm = self.session.query(fotosORM).filter(fotosORM.nome_original_arquivo == prefix).first()
					if foto_orm:
						logger.info("find_by_path_or_name: prefix match prefix=%s -> id=%s", prefix, foto_orm.id)
						logger.debug("find_by_path_or_name: prefix match prefix=%s -> id=%s", prefix, foto_orm.id)
						return Foto.model_validate(foto_orm)

			# 3) fallback: varrer os N registros mais recentes e verificar substring matching no Python
			recent = self.session.query(fotosORM).order_by(fotosORM.id.desc()).limit(200).all()
			for r in recent:
				# r.nome_original_arquivo costuma ser algo como '20260423_204123.jpg'
				if r.nome_original_arquivo and r.nome_original_arquivo in candidate:
					logger.info("find_by_path_or_name: recent match by nome_original_arquivo candidate=%s contains %s -> id=%s", candidate, r.nome_original_arquivo, r.id)
					logger.debug("recent match by nome_original_arquivo: candidate=%s contains %s -> id=%s", candidate, r.nome_original_arquivo, r.id)
					return Foto.model_validate(r)
				if r.nome_aquivo and r.nome_aquivo in candidate:
					logger.info("find_by_path_or_name: recent match by nome_aquivo substring candidate=%s contains %s -> id=%s", candidate, r.nome_aquivo, r.id)
					logger.debug("recent match by nome_aquivo substring: candidate=%s contains %s -> id=%s", candidate, r.nome_aquivo, r.id)
					return Foto.model_validate(r)
				if r.caminho_arquivo and r.caminho_arquivo.endswith(candidate):
					logger.info("find_by_path_or_name: recent match by caminho suffix candidate=%s -> caminho=%s id=%s", candidate, r.caminho_arquivo, r.id)
					logger.debug("recent match by caminho suffix: candidate=%s -> caminho=%s id=%s", candidate, r.caminho_arquivo, r.id)
					return Foto.model_validate(r)

			logger.info("find_by_path_or_name: no foto found for candidate=%s", candidate)
			logger.debug("find_by_path_or_name: no foto found for candidate=%s", candidate)
			# nada encontrado
			return None
