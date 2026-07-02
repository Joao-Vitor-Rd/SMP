import logging
from typing import List

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from src.modules.analise.domain.constants import MIN_DETECCAO_CONFIDENCE
from src.modules.analise.domain.entities.deteccao import Deteccao, DeteccaoORM
from src.modules.analise.domain.repositories.i_deteccao_repository import IDeteccaoRepository

logger = logging.getLogger(__name__)


class DeteccaoRepository(IDeteccaoRepository):
    def __init__(self, session: Session):
        self.session = session

    def replace_for_inspecao(self, inspecao_id: int, deteccoes: List[Deteccao]) -> List[Deteccao]:
        try:
            self.session.query(DeteccaoORM).filter(DeteccaoORM.inspecao_id == inspecao_id).delete(
                synchronize_session=False
            )

            orms: List[DeteccaoORM] = []
            for deteccao in deteccoes:
                if float(deteccao.confidence_score) < MIN_DETECCAO_CONFIDENCE:
                    continue
                defeito_value = (
                    deteccao.defeito.value if hasattr(deteccao.defeito, "value") else deteccao.defeito
                )
                orm = DeteccaoORM(
                    inspecao_id=inspecao_id,
                    defeito=defeito_value,
                    confidence_score=float(deteccao.confidence_score),
                    severidade=deteccao.severidade,
                    observacao=deteccao.observacao,
                    imagem_id=deteccao.imagem_id,
                    revisado_manualmente=bool(deteccao.revisado_manualmente),
                )
                self.session.add(orm)
                orms.append(orm)

            self.session.commit()

            for orm in orms:
                self.session.refresh(orm)

            salvas = [Deteccao.model_validate(orm) for orm in orms]
            return salvas

        except IntegrityError as exc:
            self.session.rollback()
            logger.exception(
                "IntegrityError ao salvar detecções | inspecao_id=%s | "
                "verifique se laudo.id=%s existe (FK deteccao.inspecao_id -> laudo.id)",
                inspecao_id,
                inspecao_id,
            )
            raise ValueError(
                f"Erro de integridade ao salvar detecções da inspeção {inspecao_id}. "
                "Verifique se o laudo existe e se as migrations foram aplicadas."
            ) from exc
        except SQLAlchemyError as exc:
            self.session.rollback()
            logger.exception("SQLAlchemyError ao salvar detecções | inspecao_id=%s", inspecao_id)
            raise ValueError(f"Erro de banco ao salvar detecções da inspeção {inspecao_id}") from exc

    def list_by_inspecao(self, inspecao_id: int) -> List[Deteccao]:
        orms = (
            self.session.query(DeteccaoORM)
            .filter(DeteccaoORM.inspecao_id == inspecao_id)
            .order_by(DeteccaoORM.id.asc())
            .all()
        )
        return [Deteccao.model_validate(orm) for orm in orms]
