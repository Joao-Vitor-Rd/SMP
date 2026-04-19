from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.application.interfaces.validador_crea import ValidadorCREA
from src.modules.supervisor.application.dtos import CreateSupervisorDTO
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

    def execute(self, create_data: CreateSupervisorDTO) -> Supervisor:
        #validar CREA
        crea_existente = self.validador_crea.validar(
            create_data.idendificador_profissional,
            create_data.name
        )
        if not crea_existente:
            raise ValueError(f"CREA inválido")

        # Validar UF
        if not UFEnum.is_valid(create_data.uf):
            raise ValueError(f"UF inválida")
        
        # Validar se o email já existe
        email_existente = self.repository.find_by_email(create_data.email)
        if email_existente:
            raise ValueError(f"Email já cadastrado no sistema")
        
        #valida tamanho da senha
        if len(create_data.password) < 8:
             raise ValueError(f"Senha deve conter 8 caracteres")

        #garantir hash da senha
        senha_hash = self.hasher.hash(create_data.password)

        novo_supervisor = Supervisor(
            name=create_data.name,
            email=create_data.email,
            password=senha_hash,
            idendificador_profissional=create_data.idendificador_profissional,
            uf=create_data.uf,
            cidade=create_data.cidade
        )
        return self.repository.save(novo_supervisor)
