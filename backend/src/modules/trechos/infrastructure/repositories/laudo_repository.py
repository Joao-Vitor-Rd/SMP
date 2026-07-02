from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from src.modules.trechos.domain.repositories.i_laudo_repository import ILaudoRepository
from src.modules.trechos.domain.entities.laudo import Laudo, LaudoORM, UsuarioLaudo
from src.modules.analise.domain.entities.deteccao import Deteccao, DeteccaoORM
from src.shared.domain.entities.user import UserORM
from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM


class LaudoRepository(ILaudoRepository):

    def __init__(self, session: Session):
        self.session = session

    def create(self, responsavel: str, data: datetime, colaboradores_ids: List[int],  resumo: dict[str, int],  credencial_responsavel: str) -> Laudo:
        # Buscar os colaboradores correspondentes aos IDs passados
        colaboradores = []
        if colaboradores_ids:
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
            usuarios=usuarios,
            resumo=resumo,
            credencial_responsavel=credencial_responsavel
        )
        self.session.add(laudo_orm)
        
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao criar laudo") from exc

        self.session.refresh(laudo_orm)
        return self._to_domain(laudo_orm)

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
        return [self._to_domain(laudo_orm) for laudo_orm in laudos_orm]
    

    def list_by_usuario(self, usuario_id: int) -> List[Laudo]:
        try:
            self.session.expire_all()
        except Exception:
            pass

        laudos_orm = (
            self.session.query(LaudoORM)
            .join(LaudoORM.usuarios)          
            .filter(UserORM.id == usuario_id)  
            .union(
                self.session.query(LaudoORM)
                .filter(LaudoORM.responsavel_user_id == usuario_id)  
            )
            .order_by(LaudoORM.data.desc())
            .all()
        )

        return [self._to_domain(laudo_orm) for laudo_orm in laudos_orm]

    def update(
        self,
        laudo_id: int,
        responsavel: str,
        data: datetime,
        colaboradores_ids: List[int],
        resumo: dict[str, int],
        credencial_responsavel: str,
    ) -> Optional[Laudo]:

        laudo_orm = (
            self.session.query(LaudoORM)
            .filter(LaudoORM.id == laudo_id)
            .first()
        )

        if not laudo_orm:
            return None

        colaboradores = []
        if colaboradores_ids:

            colaboradores = (
                self.session.query(ColaboradorORM)
                .filter(ColaboradorORM.id.in_(colaboradores_ids))
                .all()
            )

            encontrados_ids = {c.id for c in colaboradores}
            nao_encontrados = set(colaboradores_ids) - encontrados_ids

            if nao_encontrados:
                raise ValueError(
                    f"Colaborador(es) com ID(s) {list(nao_encontrados)} não encontrado(s)"
                )

        usuarios = [c.user for c in colaboradores if c.user is not None]

        laudo_orm.responsavel = responsavel
        laudo_orm.data = data
        laudo_orm.resumo = resumo
        laudo_orm.credencial_responsavel = credencial_responsavel
        laudo_orm.usuarios = usuarios

        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao atualizar laudo") from exc

        self.session.refresh(laudo_orm)

        return self._to_domain(laudo_orm)  

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

        return self._to_domain(laudo_orm) if laudo_orm else None

    def publicar(self, laudo_id: int, resumo: dict) -> Optional[dict]:
        laudo_orm = (
            self.session.query(LaudoORM)
            .filter(LaudoORM.id == laudo_id)
            .first()
        )

        if not laudo_orm:
            return None

        laudo_orm.publicado_em = datetime.now(timezone.utc)
        laudo_orm.publicacao_resumo = resumo

        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao publicar laudo") from exc

        self.session.refresh(laudo_orm)

        return {
            "id": laudo_orm.id,
            "publicado_em": laudo_orm.publicado_em,
            "resumo": laudo_orm.publicacao_resumo,
        }

    def _to_domain(self, laudo_orm: LaudoORM) -> Laudo:
        usuarios = []
        for user in laudo_orm.usuarios:
            colaborador = (
                self.session.query(ColaboradorORM)
                .filter(ColaboradorORM.user_id == user.id)
                .first()
            )
            usuarios.append(
                UsuarioLaudo(
                    id=colaborador.id if colaborador else user.id,
                    nome=user.nome,
                    cargo=user.cargo,
                )
            )

        # Status e resumo de publicação: um laudo só é "concluido" quando
        # publicado_em está preenchido (fluxo de publicação). Antes disso,
        # ele é um "rascunho". O relatório usa esse status pra decidir o que
        # mostrar — sem isso, laudos publicados ficavam invisíveis pra API.
        status = "concluido" if laudo_orm.publicado_em is not None else "rascunho"

        return Laudo(
            id=laudo_orm.id,
            data=laudo_orm.data,
            responsavel=laudo_orm.responsavel,
            responsavel_user_id=getattr(laudo_orm, "responsavel_user_id", None),
            credencial_responsavel=laudo_orm.credencial_responsavel,
            usuarios=usuarios,
            resumo=laudo_orm.resumo or {},
            status=status,
            publicado_em=laudo_orm.publicado_em,
            publicacao_resumo=laudo_orm.publicacao_resumo,
        )
