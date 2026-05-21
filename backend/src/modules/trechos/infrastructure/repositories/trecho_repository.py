from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.modules.fotos.domain.entities.fotos import fotosORM
from src.modules.trechos.domain.entities.trecho import Trecho, TrechoORM
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository


class TrechoRepository(ITrechoRepository):
    def __init__(self, session: Session):
        self.session = session

    def create_with_fotos(self, foto_ids: list[int]) -> Trecho:
        trecho_orm = TrechoORM()
        self.session.add(trecho_orm)
        self.session.flush()

        if foto_ids:
            self.session.query(fotosORM).filter(fotosORM.id.in_(foto_ids)).update(
                {fotosORM.trecho_id: trecho_orm.id_trecho},
                synchronize_session=False,
            )

        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao criar trecho e associar fotos") from exc

        self.session.refresh(trecho_orm)
        return Trecho.model_validate(trecho_orm)
