from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.application.interfaces.validador_crea import ValidadorCREA
from src.shared.security.password_hash import PassWordHasher
from src.shared.enums.uf_enum import UFEnum

class CriarSupervisorUseCase:

    def __init__(
            self, 
            repository: ISupervisorRepository,
            validador_crea: ValidadorCREA,
            hasher: PassWordHasher
        ):
        self.repository = repository
        self.validador_crea = validador_crea
        self.hasher = hasher

    def execute(self, supervisor: Supervisor) -> Supervisor:
        #validar CREA
        crea_existente = self.validador_crea.validar(
            supervisor.idendificador_profissional,
            supervisor.name
        )
        if crea_existente == False:
            raise ValueError(f"CREA inválido")

        # Validar UF
        if not UFEnum.is_valid(supervisor.uf):
            raise ValueError(f"UF inválida")
        
        # Validar se o email já existe
        email_existente = self.repository.find_by_email(supervisor.email)
        if email_existente:
            raise ValueError(f"Email já cadastrado no sistema")
        
        #valida tamanho da senha
        if len(supervisor.password) < 8:
             raise ValueError(f"Senha deve conter 8 caracteres")

        #garantir hash da senha
        senha_hash = self.hasher.hash(supervisor.password)

        novo_supervisor = Supervisor(
            name=supervisor.name,
            email=supervisor.email,
            password=senha_hash,
            idendificador_profissional=supervisor.idendificador_profissional,
            uf=supervisor.uf,
            cidade=supervisor.cidade
        )
        return self.repository.save(novo_supervisor)
