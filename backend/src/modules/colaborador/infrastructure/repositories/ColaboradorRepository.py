from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.modules.colaborador.domain.repositories.IColaboradorRepository import IColaboradorRepository
from src.modules.colaborador.domain.entities.colaborador import Colaborador, ColaboradorORM
from datetime import datetime, timezone


class ColaboradorRepository(IColaboradorRepository):

    def __init__(self, session: Session):
        self.session = session

    def save(self, colaborador: Colaborador) -> Colaborador:
        col_orm = ColaboradorORM(
            nome=colaborador.nome,
            id_profissional_responsavel=colaborador.id_profissional_responsavel,
            uf=colaborador.uf,
            cidade=colaborador.cidade,
            instituicao_ensino=colaborador.instituicao_ensino,
            empresa_ou_orgao=colaborador.empresa_ou_orgao,
            telefone=colaborador.telefone,
            is_tecnico=colaborador.is_tecnico,
            email=colaborador.email,
            senha=colaborador.senha,
            limite_acesso=colaborador.limite_acesso,
            acesso_liberado=colaborador.acesso_liberado,
        )
        self.session.add(col_orm)
        try:
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            error_msg = str(e)

            # Extrair o nome do campo da constraint
            campo = None
            if "colaborador_email_key" in error_msg.lower():
                campo = "Email"
            elif "colaborador_id_profissional_responsavel_fkey" in error_msg.lower():
                campo = "ID profissional responsável"
            
            if campo:
                raise ValueError(f"{campo} já cadastrado no sistema")
            raise
        self.session.refresh(col_orm)
        return Colaborador.model_validate(col_orm)


    def find_all(self) -> List[Colaborador]:
        cols_orm = self.session.query(ColaboradorORM).all()
        return [Colaborador.model_validate(col_orm) for col_orm in cols_orm]

    def find_by_supervisor_id(self, id_profissional_responsavel: str) -> List[Colaborador]:
        cols_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.id_profissional_responsavel == id_profissional_responsavel
        ).all()
        return [Colaborador.model_validate(col_orm) for col_orm in cols_orm]

    def find_by_email(self, email: str) -> Optional[Colaborador]:
        col_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.email == email
        ).first()
        return Colaborador.model_validate(col_orm) if col_orm else None

    def update_tentativas(self, colaborador_id: int, tentativas: int):
        col_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.id == colaborador_id
        ).first()
        
        if not col_orm:
            raise ValueError(f"Colaborador com ID {colaborador_id} não encontrado")
        
        col_orm.tentativas_falhas = tentativas
        self.session.commit()
        self.session.refresh(col_orm)

    def update_tempo_bloqueio(self, colaborador_id: int, tempo_bloqueio: Optional[datetime]):
        col_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.id == colaborador_id
        ).first()
        
        if not col_orm:
            raise ValueError(f"Colaborador com ID {colaborador_id} não encontrado")
        
        col_orm.limite_de_bloqueio = tempo_bloqueio
        self.session.commit()
        self.session.refresh(col_orm)
    
    def update_acesso(self, colaborador_id: int):
        col_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.id == colaborador_id
        ).first()
        
        if not col_orm:
            raise ValueError(f"Colaborador com ID {colaborador_id} não encontrado")
        
        col_orm.acesso_liberado = not col_orm.acesso_liberado
        self.session.commit()
        self.session.refresh(col_orm)
    
    def update_limite_acesso(self, colaborador_id: int, limite_acesso: datetime):
        col_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.id == colaborador_id
        ).first()
        
        if not col_orm:
            raise ValueError(f"Colaborador com ID {colaborador_id} não encontrado")
        
        col_orm.limite_acesso = limite_acesso
        self.session.commit()
        self.session.refresh(col_orm)

    def delete(self, colaborador_id: int) -> None:
        col_orm = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.id == colaborador_id
        ).first()
        
        if not col_orm:
            raise ValueError(f"Colaborador com ID {colaborador_id} não encontrado")
        
        self.session.delete(col_orm)
        self.session.commit()


