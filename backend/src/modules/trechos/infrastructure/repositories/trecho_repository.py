from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from src.modules.fotos.domain.entities.fotos import fotosORM
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
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

    def list_all(self, bbox_filter: TrechoBoundingBoxFilterDTO | None = None) -> list[Trecho]:
        # ensure session state is fresh so updates to fotos are visible
        try:
            self.session.expire_all()
        except Exception:
            # expire_all may fail if session closed; ignore and proceed
            pass

        query = self.session.query(TrechoORM)

        if bbox_filter is not None:
            query = query.filter(
                TrechoORM.fotos.any(
                    and_(
                        fotosORM.latitude.is_not(None),
                        fotosORM.longitude.is_not(None),
                        fotosORM.latitude >= bbox_filter.bottom_right_lat,
                        fotosORM.latitude <= bbox_filter.top_left_lat,
                        fotosORM.longitude >= bbox_filter.top_left_lng,
                        fotosORM.longitude <= bbox_filter.bottom_right_lng,
                    )
                )
            )

        trechos_orm = query.options(selectinload(TrechoORM.fotos)).order_by(TrechoORM.criado_em.desc()).all()
        return [Trecho.model_validate(trecho_orm) for trecho_orm in trechos_orm]
