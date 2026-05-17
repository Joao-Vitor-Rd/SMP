from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.domain.entities.supervisor import Supervisor, SupervisorORM
from src.modules.colaborador.domain.entities.colaborador import Colaborador, ColaboradorORM
from src.shared.domain.entities.user import UserORM, CargoEnum
from src.modules.colaborador.application.dtos.colaborador_dto import ColaboradorResponseDTO, ListarColaboradoresDTO
from datetime import datetime, timezone

class SupervisorRepository(ISupervisorRepository):

    def __init__(self, session: Session):
        self.session = session

    def save(self, supervisor: Supervisor) -> Supervisor:
        # Criar e fazer flush do user PRIMEIRO para obter seu ID
        user_orm = UserORM(
            nome=supervisor.name,
            email=supervisor.email,
            cargo=CargoEnum.SUPERVISOR
        )
        self.session.add(user_orm)
        self.session.flush()  # Obter ID do user
        
        # Agora criar supervisor COM user_id preenchido
        sup_orm = SupervisorORM(
            name=supervisor.name,
            idendificador_profissional=supervisor.idendificador_profissional,
            uf=supervisor.uf,
            cidade=supervisor.cidade,
            email=supervisor.email,
            password=supervisor.password,
            user_id=user_orm.id  # FK já preenchido
        )
        self.session.add(sup_orm)
        
        try:
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            error_msg = str(e)

            # Extrair o nome do campo da constraint
            campo = None
            if "supervisor_email_key" in error_msg.lower() or "user_email_key" in error_msg.lower():
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
    
    def find_by_identificador_profissional(self, idendificador_profissional: int) -> Optional[Supervisor]:
        sup_orm = self.session.query(SupervisorORM).filter(SupervisorORM.idendificador_profissional == idendificador_profissional).first()
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

    def update_supervisor(self, novo_supervisor: Supervisor) -> Supervisor:
        sup_orm = self.session.get(SupervisorORM, novo_supervisor.id)

        if not sup_orm: 
            raise ValueError("Supervisor não encontrado")
        
        sup_orm.name = novo_supervisor.name
        sup_orm.cidade = novo_supervisor.cidade
        sup_orm.empresa_ou_orgao = novo_supervisor.empresa_ou_orgao
        sup_orm.telefone = novo_supervisor.telefone
        sup_orm.uf = novo_supervisor.uf

        try:
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            error_msg = str(e).lower()

            campo = None
            if "supervisor_email_key" in error_msg:
                campo = "Email"
            elif "supervisor_idendificador_profissional_key" in error_msg:
                campo = "Identificador profissional"

            if campo:
                raise ValueError(f"{campo} já cadastrado no sistema")
            raise

        self.session.refresh(sup_orm)
        return Supervisor.model_validate(sup_orm)
    
    def listar_meus_colaboradores(self, supervisor_id) -> List[ListarColaboradoresDTO]:
        cols_orm = self.session.query(ColaboradorORM).filter(
                ColaboradorORM.id_profissional_responsavel == supervisor_id,
                ColaboradorORM.is_tecnico == False
            ).all()
        if cols_orm:
            return [ListarColaboradoresDTO(
                id=col.id,
                nome=col.nome,
                email=col.email,
                limite_acesso=col.limite_acesso,
                ativo=col.acesso_liberado
            ) for col in cols_orm]
        return []
        
