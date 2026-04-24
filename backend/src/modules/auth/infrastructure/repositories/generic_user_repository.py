from typing import Optional
from sqlalchemy.orm import Session
from src.modules.auth.domain.repositories.i_user_repository import IUserRepository
from src.modules.supervisor.domain.entities.supervisor import SupervisorORM
from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM
from datetime import datetime


class GenericUserRepository(IUserRepository):
    
    def __init__(self, session: Session):
        self.session = session
    
    def find_by_email(self, email: str) -> Optional[dict]:
        # Tenta buscar em supervisor
        supervisor = self.session.query(SupervisorORM).filter(
            SupervisorORM.email == email
        ).first()
        
        if supervisor:
            return {
                "user": supervisor,
                "user_type": "supervisor",
                "cargo": "supervisor",
                "id": supervisor.id,
                "email": supervisor.email,
                "password": supervisor.password,
                "nome": supervisor.name,
                "identificador_profissional": supervisor.idendificador_profissional,
                "limite_acesso": None,
                "acesso_liberado": True,
            }
        
        # Tenta buscar em colaborador
        colaborador = self.session.query(ColaboradorORM).filter(
            ColaboradorORM.email == email
        ).first()
        
        if colaborador:
            return {
                "user": colaborador,
                "user_type": "colaborador",
                "cargo": "tecnico" if colaborador.is_tecnico else "colaborador",
                "id": colaborador.id,
                "email": colaborador.email,
                "password": colaborador.senha,
                "nome": colaborador.nome,
                "cft": colaborador.cft,
                "limite_acesso": colaborador.limite_acesso,
                "acesso_liberado": colaborador.acesso_liberado,
            }
        
        return None
    
    def update_failed_attempts(self, user_type: str, user_id: int, attempts: int) -> None:
        if user_type == "supervisor":
            supervisor = self.session.query(SupervisorORM).filter(
                SupervisorORM.id == user_id
            ).first()
            if supervisor:
                supervisor.tentativas_falhas = attempts
                self.session.commit()
                self.session.refresh(supervisor)
        elif user_type == "colaborador":
            colaborador = self.session.query(ColaboradorORM).filter(
                ColaboradorORM.id == user_id
            ).first()
            if colaborador:
                colaborador.tentativas_falhas = attempts
                self.session.commit()
                self.session.refresh(colaborador)
    
    def update_lock_time(self, user_type: str, user_id: int, lock_time: Optional[datetime]) -> None:
        if user_type == "supervisor":
            supervisor = self.session.query(SupervisorORM).filter(
                SupervisorORM.id == user_id
            ).first()
            if supervisor:
                supervisor.limite_de_bloqueio = lock_time
                self.session.commit()
                self.session.refresh(supervisor)
        elif user_type == "colaborador":
            colaborador = self.session.query(ColaboradorORM).filter(
                ColaboradorORM.id == user_id
            ).first()
            if colaborador:
                colaborador.limite_de_bloqueio = lock_time
                self.session.commit()
                self.session.refresh(colaborador)
