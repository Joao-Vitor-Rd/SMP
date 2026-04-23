from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.supervisor.application.interfaces.validador_crea import ValidadorCREA
from src.modules.supervisor.application.dtos import CreateSupervisorDTO, SupervisorResponseDTO
from src.shared.security.password_hash import PassWordHasher
from src.shared.enums.uf_enum import UFEnum
import re
from src.shared.domain.interfaces.i_email_validator import IEmailValidator
from src.shared.domain.interfaces.i_email_unico_validator import IEmailUnicoValidator

class CriarSupervisorUseCase:

    def __init__(
            self, 
            repository: ISupervisorRepository,
            validador_crea: ValidadorCREA,
            hasher: PassWordHasher,
            email_validator: IEmailValidator,
            email_unico_validator: IEmailUnicoValidator
        ):
        self.repository = repository
        self.validador_crea = validador_crea
        self.hasher = hasher
        self.email_validator = email_validator
        self.email_unico_validator = email_unico_validator

    def execute(self, create_data: CreateSupervisorDTO) -> SupervisorResponseDTO:
        # TODO: reativar validação de CREA após testes
        # crea_existente = self.validador_crea.validar(
        #     create_data.identificador_profissional,
        #     create_data.nome
        # )
        # if not crea_existente:
        #     raise ValueError(f"CREA inválido")

        # Validar UF
        if not UFEnum.is_valid(create_data.uf):
            raise ValueError(f"UF inválida")
        
        # Validar formato do email
        if not self.email_validator.validar_email(create_data.email):
            raise ValueError(f"Email inválido")
        
        # Validar se o email já existe (consulta única UNION em ambas tabelas)
        if self.email_unico_validator.validar_email_unico(create_data.email):
            raise ValueError(f"Email já cadastrado no sistema")
        
        #valida tamanho da senha
        if len(create_data.senha) < 8 :
            raise ValueError(f"Senha deve conter 8 caracteres")
        
        padrao = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
    
        if not re.match(padrao, create_data.senha):
            raise ValueError(f"Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número")

        #garantir hash da senha
        senha_hash = self.hasher.hash(create_data.senha)

        novo_supervisor = Supervisor(
            name=create_data.nome.title(),
            email=create_data.email,
            password=senha_hash,
            idendificador_profissional=create_data.identificador_profissional,
            uf=create_data.uf,
            cidade=create_data.cidade
        )
        supervisor_salvo = self.repository.save(novo_supervisor)
        return SupervisorResponseDTO(
            id=supervisor_salvo.id,
            nome=supervisor_salvo.name,
            email=supervisor_salvo.email,
            identificador_profissional=supervisor_salvo.idendificador_profissional,
            uf=supervisor_salvo.uf,
            cidade=supervisor_salvo.cidade
        )
