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
