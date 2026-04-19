from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.domain.entities.supervisor import Supervisor, SupervisorORM
from datetime import datetime, timezone

class SupervisorRepository(ISupervisorRepository):

    def __init__(self, session: Session):
        self.session = session

    def save(self, supervisor: Supervisor) -> Supervisor:
        sup_orm = SupervisorORM(
            name=supervisor.name,
            idendificador_profissional=supervisor.idendificador_profissional,
            uf=supervisor.uf,
            cidade=supervisor.cidade,
            email=supervisor.email,
            password=supervisor.password
        )
        self.session.add(sup_orm)
        try:
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            error_msg = str(e)

            # Extrair o nome do campo da constraint
            campo = None
            if "supervisor_email_key" in error_msg.lower():
                campo = "Email"
            elif "supervisor_idendificador_profissional_key" in error_msg.lower():
                campo = "Identificador profissional"
            
            if campo:
                raise ValueError(f"{campo} já cadastrado no sistema")
            raise
        self.session.refresh(sup_orm)
        return Supervisor.model_validate(sup_orm)

    def find_by_id(self, supervisor_id: int) -> Optional[Supervisor]:
        sup_orm = self.session.query(SupervisorORM).filter(SupervisorORM.id == supervisor_id).first()
        if sup_orm:
            return Supervisor.model_validate(sup_orm)
        return None

    def find_by_email(self, email: str) -> Optional[Supervisor]:
        sup_orm = self.session.query(SupervisorORM).filter(SupervisorORM.email == email).first()
        if sup_orm:
            return Supervisor.model_validate(sup_orm)
        return None

    def find_all(self) -> List[Supervisor]:
        sups_orm = self.session.query(SupervisorORM).all()
        return [Supervisor.model_validate(sup_orm) for sup_orm in sups_orm]
    
    def update_tentativas(self, supervisor_id: int, tentativas: int):
        supervisor_orm = self.session.query(SupervisorORM).filter(
            SupervisorORM.id == supervisor_id
        ).first()
        
        if not supervisor_orm:
            raise ValueError(f"Supervisor com ID {supervisor_id} não encontrado")
        
        supervisor_orm.tentativas_falhas = tentativas
        self.session.commit()
        self.session.refresh(supervisor_orm)
        

    def update_tempo_bloqueio(self, supervisor_id: int, tempo_bloqueio: datetime):
        supervisor_orm = self.session.query(SupervisorORM).filter(
            SupervisorORM.id == supervisor_id
        ).first()
        
        if not supervisor_orm:
            raise ValueError(f"Supervisor com ID {supervisor_id} não encontrado")
        
        supervisor_orm.limite_de_bloqueio = tempo_bloqueio
        self.session.commit()
        self.session.refresh(supervisor_orm)
        
