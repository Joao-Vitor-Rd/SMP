from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.application.interfaces.validador_crea import ValidadorCREA

class CriarSupervisorUseCase:

    def __init__(
            self, 
            repository: ISupervisorRepository,
            validador_crea: ValidadorCREA
        ):
        self.repository = repository
        self.validador_crea = validador_crea

    def execute(self, supervisor: Supervisor) -> Supervisor:
        # Validar se já existe supervisor com este identificador
        crea_existente = self.validador_crea.validar(
            supervisor.idendificador_profissional, 
            supervisor.name
        )

        #validar se o identificador pertence a pessoa
        if not crea_existente:
            raise ValueError(f"Identificador profissional inválido")        

        # Validar se o email já existe
        email_existente = self.repository.find_by_email(supervisor.email)
        if email_existente:
            raise ValueError(f"Email já cadastrado no sistema")

        return self.repository.save(supervisor)
