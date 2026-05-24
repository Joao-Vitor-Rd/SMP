from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.modules.fotos.domain.entities.fotos import Foto, fotosORM
from src.modules.fotos.domain.repositories.i_foto_repository import IFotoRepository


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
		fotos_orm = self.session.query(fotosORM).order_by(fotosORM.id.desc()).all()
		return [Foto.model_validate(foto_orm) for foto_orm in fotos_orm]

	def find_by_id(self, foto_id: int) -> Foto | None:
		foto_orm = self.session.query(fotosORM).filter(fotosORM.id == foto_id).first()
		return Foto.model_validate(foto_orm) if foto_orm else None

	def update_localizacao(self, foto_id: int, latitude: float, longitude: float) -> Foto | None:
		foto_orm = self.session.query(fotosORM).filter(fotosORM.id == foto_id).first()
		if foto_orm is None:
			return None

		foto_orm.latitude = latitude
		foto_orm.longitude = longitude
		self.session.commit()
		self.session.refresh(foto_orm)
		return Foto.model_validate(foto_orm)

	def find_by_path_or_name(self, identifier: str) -> Foto | None:
		candidate = (identifier or "").strip()
		if not candidate:
			return None

		foto_orm = (
			self.session.query(fotosORM)
			.filter(
				(fotosORM.caminho_arquivo == candidate)
				| (fotosORM.nome_aquivo == candidate)
				| (fotosORM.nome_original_arquivo == candidate)
			)
			.first()
		)

		return Foto.model_validate(foto_orm) if foto_orm else None
