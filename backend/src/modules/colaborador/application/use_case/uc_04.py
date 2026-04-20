from src.modules.colaborador.domain.entities.colaborador import Colaborador
from src.modules.colaborador.domain.repositories.IColaboradorRepository import IColaboradorRepository
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.colaborador.application.dtos.colaborador_dto import CreateColaboradorDTO
from src.modules.colaborador.application.dtos.colaborador_dto import ColaboradorResponseDTO
from src.shared.security.password_hash import PassWordHasher
from src.shared.domain.interfaces.ICriadorSenha import ICriadorSenha
from src.shared.enums.uf_enum import UFEnum
from src.shared.domain.interfaces.INotificacaoService import INotificacaoService
from src.shared.domain.interfaces.i_email_validator import IEmailValidator

class CriarColaboradorUseCase:

    def __init__(
            self, 
            repository: IColaboradorRepository,
            repository_supervisor: ISupervisorRepository,
            criador_senha: ICriadorSenha,
            hasher: PassWordHasher,
            email_sender: INotificacaoService,
            email_validator: IEmailValidator
        ):
        self.repository = repository
        self.repository_supervisor = repository_supervisor
        self.criador_senha = criador_senha
        self.hasher = hasher
        self.email_sender = email_sender
        self.email_validator = email_validator

    def execute(self, create_data: CreateColaboradorDTO) -> ColaboradorResponseDTO:

        supervisor_existente = self.repository_supervisor.find_by_identificador_profissional(
            create_data.id_profissional_responsavel
        )

        #valida identificador do supervisor
        if supervisor_existente == None:
            raise ValueError(f"Supervisor com identificador: {create_data.id_profissional_responsavel} não cadastrado no sistema")

        # Validar UF
        if not UFEnum.is_valid(create_data.uf):
            raise ValueError(f"UF inválida")
        
        # Validar formato do email
        if not self.email_validator.validar_email(create_data.email):
            raise ValueError(f"Email inválido")
        
        # Validar se o email já existe
        email_existente = self.repository.find_by_email(create_data.email)
        if email_existente:
            raise ValueError(f"Email já cadastrado no sistema")
        
        #gerar senha
        senha = self.criador_senha.gerar_senha()

        #garantir hash da senha
        senha_hash = self.hasher.hash(senha)

        try:
            novo_colaborador = Colaborador(
                nome=create_data.nome.title(),
                id_profissional_responsavel=create_data.id_profissional_responsavel,
                uf=create_data.uf,
                cidade=create_data.cidade,
                email=create_data.email,
                senha=senha_hash,
                limite_acesso=create_data.limite_acesso,
                acesso_liberado=create_data.acesso_liberado,
            )
            
            colaborador_salvo = self.repository.save(novo_colaborador)
            
            try:
                self.email_sender.enviar_notificacao(
                    senha_usuario=senha,
                    nome_usuario=novo_colaborador.nome,
                    email_usuario=novo_colaborador.email
                )
            except Exception as email_error:
                self.repository.delete(colaborador_salvo.id)
                print(f"Erro no email: {str(email_error)}")
                raise
            
            return ColaboradorResponseDTO(
                id=colaborador_salvo.id,
                nome=colaborador_salvo.nome,
                id_profissional_responsavel=colaborador_salvo.id_profissional_responsavel,
                uf=colaborador_salvo.uf,
                cidade=colaborador_salvo.cidade,
                email=colaborador_salvo.email,
                limite_acesso=colaborador_salvo.limite_acesso,
                acesso_liberado=colaborador_salvo.acesso_liberado
            )
        except Exception as e:
            print(f"Erro ao criar colaborador: {str(e)}")
            raise
