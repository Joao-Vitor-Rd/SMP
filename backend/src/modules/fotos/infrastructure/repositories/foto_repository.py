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
			trecho_id=foto.trecho_id,
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

	def associate_to_trecho(self, foto_ids: list[int], trecho_id: str) -> None:
		if not foto_ids:
			return

		self.session.query(fotosORM).filter(fotosORM.id.in_(foto_ids)).update(
			{fotosORM.trecho_id: trecho_id},
			synchronize_session=False,
		)
		self.session.commit()
