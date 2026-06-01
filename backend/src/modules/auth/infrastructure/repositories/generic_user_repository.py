from typing import Optional
from sqlalchemy.orm import Session
from src.modules.auth.domain.repositories.i_user_repository import IUserRepository
from src.modules.supervisor.domain.entities.supervisor import SupervisorORM
from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM
from src.shared.domain.entities.user import UserORM, CargoEnum
from datetime import datetime


class GenericUserRepository(IUserRepository):
    
    def __init__(self, session: Session):
        self.session = session

    def find_by_id(self, user_id: int) -> Optional[UserORM]:
        return self.session.query(UserORM).filter(UserORM.id == user_id).first()

    def find_colaborador_by_user_id(self, user_id: int) -> Optional[ColaboradorORM]:
        return self.session.query(ColaboradorORM).filter(ColaboradorORM.user_id == user_id).first()

    def find_supervisor_by_user_id(self, user_id: int) -> Optional[SupervisorORM]:
        return self.session.query(SupervisorORM).filter(SupervisorORM.user_id == user_id).first()
    
    def find_by_email(self, email: str) -> Optional[dict]:
        # Buscar na tabela user pelo email
        user = self.session.query(UserORM).filter(
            UserORM.email == email
        ).first()
        
        if not user:
            return None
        
        # Baseado no cargo, buscar em supervisor ou colaborador
        if user.cargo == CargoEnum.SUPERVISOR:
            supervisor = self.find_supervisor_by_user_id(user.id)
            
            if supervisor:
                return {
                    "user": user,
                    "profile": supervisor,
                    "user_type": "supervisor",
                    "cargo": "supervisor",
                    "id": user.id,
                    "email": user.email,
                    "password": supervisor.password,
                    "nome": supervisor.name,
                    "identificador_profissional": supervisor.idendificador_profissional,
                    "limite_acesso": None,
                    "acesso_liberado": True,
                }
        
        elif user.cargo in [CargoEnum.COLABORADOR, CargoEnum.TECNICO]:
            colaborador = self.find_colaborador_by_user_id(user.id)
            
            if colaborador:
                return {
                    "user": user,
                    "profile": colaborador,
                    "user_type": "colaborador",
                    "cargo": "tecnico" if colaborador.is_tecnico else "colaborador",
                    "id": user.id,
                    "email": user.email,
                    "password": colaborador.senha,
                    "nome": colaborador.nome,
                    "cft": colaborador.cft,
                    "limite_acesso": colaborador.limite_acesso,
                    "acesso_liberado": colaborador.acesso_liberado,
                }
        
        return None
    
    def update_failed_attempts(self, user_type: str, user_id: int, attempts: int) -> None:
        if user_type == "supervisor":
            supervisor = self.find_supervisor_by_user_id(user_id)
            if supervisor:
                supervisor.tentativas_falhas = attempts
                self.session.commit()
                self.session.refresh(supervisor)
        elif user_type == "colaborador":
            colaborador = self.find_colaborador_by_user_id(user_id)
            if colaborador:
                colaborador.tentativas_falhas = attempts
                self.session.commit()
                self.session.refresh(colaborador)
    
    def update_lock_time(self, user_type: str, user_id: int, lock_time: Optional[datetime]) -> None:
        if user_type == "supervisor":
            supervisor = self.find_supervisor_by_user_id(user_id)
            if supervisor:
                supervisor.limite_de_bloqueio = lock_time
                self.session.commit()
                self.session.refresh(supervisor)
        elif user_type == "colaborador":
            colaborador = self.find_colaborador_by_user_id(user_id)
            if colaborador:
                colaborador.limite_de_bloqueio = lock_time
                self.session.commit()
                self.session.refresh(colaborador)

    def update_password_by_user_id(self, user_id: int, senha_hash: str) -> None:
        user = self.find_by_id(user_id)

        if not user:
            raise ValueError("Usuário não encontrado")

        if user.cargo == CargoEnum.SUPERVISOR:
            supervisor = self.find_supervisor_by_user_id(user_id)
            if not supervisor:
                raise ValueError("Perfil de supervisor não encontrado")
            supervisor.password = senha_hash
            self.session.commit()
            self.session.refresh(supervisor)
            return

        if user.cargo in [CargoEnum.COLABORADOR, CargoEnum.TECNICO]:
            colaborador = self.find_colaborador_by_user_id(user_id)
            if not colaborador:
                raise ValueError("Perfil de colaborador não encontrado")
            colaborador.senha = senha_hash
            self.session.commit()
            self.session.refresh(colaborador)
            return

        raise ValueError("Cargo de usuário não suportado para redefinição de senha")
