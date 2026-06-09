from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo, LaudoORM
from src.shared.domain.entities.user import UserORM


class LaudoRepository(ILaudoRepository):

    def __init__(self, session: Session):
        self.session = session

    def create(self, responsavel: str, data: datetime, colaboradores_ids: List[int]) -> Laudo:
        # Buscar os colaboradores correspondentes aos IDs passados
        colaboradores = []
        if colaboradores_ids:
            from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM
            colaboradores = (
                self.session.query(ColaboradorORM)
                .filter(ColaboradorORM.id.in_(colaboradores_ids))
                .all()
            )
            
            # Validar se todos os IDs de colaboradores existem
            encontrados_ids = {c.id for c in colaboradores}
            nao_encontrados = set(colaboradores_ids) - encontrados_ids
            if nao_encontrados:
                raise ValueError(
                    f"Colaborador(es) com ID(s) {list(nao_encontrados)} não encontrado(s)"
                )

        # Obter os UserORM correspondentes a cada colaborador
        usuarios = [c.user for c in colaboradores if c.user is not None]

        laudo_orm = LaudoORM(
            responsavel=responsavel,
            data=data,
            usuarios=usuarios
        )
        self.session.add(laudo_orm)
        
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao criar laudo") from exc

        self.session.refresh(laudo_orm)
        return Laudo.model_validate(laudo_orm)

    def list_all(self) -> List[Laudo]:
        try:
            self.session.expire_all()
        except Exception:
            pass

        laudos_orm = (
            self.session.query(LaudoORM)
            .order_by(LaudoORM.data.desc())
            .all()
        )
        return [Laudo.model_validate(laudo_orm) for laudo_orm in laudos_orm]

    def find_by_id(self, laudo_id: int) -> Optional[Laudo]:
        try:
            self.session.expire_all()
        except Exception:
            pass

        laudo_orm = (
            self.session.query(LaudoORM)
            .filter(LaudoORM.id == laudo_id)
            .first()
        )
        return Laudo.model_validate(laudo_orm) if laudo_orm else None
