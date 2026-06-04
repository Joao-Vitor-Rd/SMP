from datetime import datetime, timezone, timedelta
import re
from fastapi import APIRouter, Depends, HTTPException
from src.modules.colaborador.domain.entities.colaborador import Colaborador
from src.modules.colaborador.domain.repositories.IColaboradorRepository import IColaboradorRepository
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.auth.domain.repositories.i_user_repository import IUserRepository
from src.modules.colaborador.application.dtos.colaborador_dto import CreateColaboradorDTO
from src.modules.colaborador.application.dtos.colaborador_dto import ColaboradorResponseDTO
from src.shared.security.password_hash import PassWordHasher
from src.shared.domain.interfaces.ICriadorSenha import ICriadorSenha
from src.shared.enums.uf_enum import UFEnum
from src.shared.domain.interfaces.INotificacaoService import INotificacaoService
from src.shared.domain.interfaces.i_email_validator import IEmailValidator
from src.shared.domain.interfaces.i_telefone_validator import ITelefoneValidator
from src.shared.domain.interfaces.i_email_unico_validator import IEmailUnicoValidator
from src.shared.domain.interfaces.i_string_sem_numeros_validator import IStringSemNumeroValidador
from src.shared.enums.cargo_enum import CargoEnum
import logging

logger = logging.getLogger(__name__)

class CriarColaboradorUseCase:

    def __init__(
            self, 
            repository: IColaboradorRepository,
            repository_supervisor: ISupervisorRepository,
            criador_senha: ICriadorSenha,
            hasher: PassWordHasher,
            email_sender: INotificacaoService,
            email_validator: IEmailValidator,
            telefone_validator: ITelefoneValidator,
            email_unico_validator: IEmailUnicoValidator,
            string_sem_numero_validator: IStringSemNumeroValidador,
            repository_user: IUserRepository | None = None
        ):
        self.repository = repository
        self.repository_user = repository_user
        self.repository_supervisor = repository_supervisor
        self.criador_senha = criador_senha
        self.hasher = hasher
        self.email_sender = email_sender
        self.email_validator = email_validator
        self.telefone_validator = telefone_validator
        self.email_unico_validator = email_unico_validator
        self.string_sem_numero_validator = string_sem_numero_validator

    def execute(self, create_data: CreateColaboradorDTO) -> ColaboradorResponseDTO:

        if create_data.is_tecnico and create_data.limite_acesso is not None:
            raise HTTPException(
                status_code=400,
                detail="Técnico não pode possuir limite_acesso."
            )

        if not create_data.is_tecnico and create_data.cft is not None:
            raise HTTPException(
                status_code=400,
                detail="Apenas técnicos podem possuir cft."
            )

        supervisor = self.repository_supervisor.find_by_id(create_data.id_profissional_responsavel)
        logger.info(
            "Lookup em supervisor.id=%s encontrado=%s",
            create_data.id_profissional_responsavel,
            supervisor is not None,
        )

        profissional_existente = None
        if supervisor is not None:
            if self.repository_user is not None:
                supervisor_user_id = getattr(supervisor, "user_id", None) or getattr(supervisor, "id", None)
                logger.info(
                    "Supervisor.id=%s resolve para user_id=%s",
                    create_data.id_profissional_responsavel,
                    supervisor_user_id,
                )
                if supervisor_user_id is not None:
                    profissional_existente = self.repository_user.find_by_id(supervisor_user_id)
                    logger.info(
                        "Lookup via supervisor.user_id=%s encontrado=%s",
                        supervisor_user_id,
                        profissional_existente is not None,
                    )
            if profissional_existente is None:
                profissional_existente = type(
                    "ResponsavelResolvido",
                    (),
                    {"id": getattr(supervisor, "id", create_data.id_profissional_responsavel), "cargo": CargoEnum.SUPERVISOR},
                )()
        else:
            if self.repository_user is not None:
                profissional_existente = self.repository_user.find_by_id(create_data.id_profissional_responsavel)
                logger.info(
                    "Lookup direto em user.id=%s encontrado=%s",
                    create_data.id_profissional_responsavel,
                    profissional_existente is not None,
                )
            if profissional_existente is None:
                raise ValueError(
                    f"Supervisor com identificador: {create_data.id_profissional_responsavel} não cadastrado no sistema"
                )

        #valida nome e formata nome
        nome_formatado = self.string_sem_numero_validator.formatar_string_sem_numero(create_data.nome).title()

        if not self.string_sem_numero_validator.validar_string_sem_numero(nome_formatado):
            raise ValueError(f"Nome deve incluir apenas letras")

        # valida se o profissional responsável existe na tabela user e é supervisor/técnico
        cargo_profissional_raw = getattr(profissional_existente, "cargo", None)
        cargo_profissional = cargo_profissional_raw.value if hasattr(cargo_profissional_raw, "value") else str(cargo_profissional_raw)
        logger.info(
            "Profissional responsável resolvido: id=%s cargo=%s",
            profissional_existente.id,
            cargo_profissional,
        )
        if cargo_profissional not in {CargoEnum.SUPERVISOR.value, CargoEnum.TECNICO.value}:
            raise ValueError(
                f"Profissional com identificador: {create_data.id_profissional_responsavel} não pode ser usado como responsável"
            )

        # Normalizar o ID salvo para sempre referenciar user.id
        create_data.id_profissional_responsavel = int(profissional_existente.id)
        
        # Validar formato do email
        email_formatado = create_data.email.strip().lower()
        if not self.email_validator.validar_email(email_formatado):
            raise ValueError(f"Email inválido")
        
        create_data.email = email_formatado

        print(create_data.cft)

        if create_data.is_tecnico:
            if not create_data.cft or not create_data.cft.strip():
                raise HTTPException(
                    status_code=400,
                    detail="CFT/CPF é obrigatório para técnico."
                )

            cft_formatado = re.sub(r"\D", "", create_data.cft)
            if len(cft_formatado) != 11:
                raise HTTPException("CFT/CPF deve conter 11 dígitos numéricos")

            if self.repository.find_by_cft(cft_formatado):
                raise ValueError("CFT/CPF já cadastrado no sistema")

            create_data.cft = cft_formatado
        else:
            create_data.cft = None

        print(create_data.cft)

        
        # Validar se o email já existe (consulta única UNION em ambas tabelas)
        if self.email_unico_validator.validar_email_unico(create_data.email):
            raise ValueError(f"Email já cadastrado no sistema")

        limite = create_data.limite_acesso

        if create_data.is_tecnico:
            limite = None
        else:
            print(limite, datetime.now(timezone.utc) )
            if limite is None:
                raise ValueError("A data de expiração do acesso é obrigatória para colaborador")
            if limite.tzinfo is None:
                limite = limite.replace(tzinfo=timezone.utc)
            print(limite, datetime.now(timezone.utc) )
            agora = datetime.now(timezone.utc)

            if limite < agora:
                raise ValueError("A data de acesso deve ser igual ou posterior ao momento atual.")

        create_data.limite_acesso = limite

        #gerar senha
        senha = self.criador_senha.gerar_senha()

        if create_data.is_tecnico:
            create_data.limite_acesso = None

        #garantir hash da senha
        senha_hash = self.hasher.hash(senha)
        
        try:
            novo_colaborador = Colaborador(
                nome=nome_formatado,
                id_profissional_responsavel=create_data.id_profissional_responsavel,
                is_tecnico=create_data.is_tecnico,
                email=create_data.email,
                cft=create_data.cft,
                senha=senha_hash,
                limite_acesso=create_data.limite_acesso,
                acesso_liberado=True,
            )
            
            colaborador_salvo = self.repository.save(novo_colaborador)
            
            try:
                self.email_sender.enviar_notificacao(
                    senha_usuario=senha,
                    nome_usuario=novo_colaborador.nome,
                    email_usuario=novo_colaborador.email,
                    is_tecnico=novo_colaborador.is_tecnico,
                    limite_acesso=novo_colaborador.limite_acesso,
                    cft=novo_colaborador.cft
                )
            except Exception as email_error:
                self.repository.delete(colaborador_salvo.id)
                print(f"Erro no email: {str(email_error)}")
                raise
            
            return ColaboradorResponseDTO(
                id=colaborador_salvo.id,
                nome=colaborador_salvo.nome,
                id_profissional_responsavel=colaborador_salvo.id_profissional_responsavel,
                is_tecnico=colaborador_salvo.is_tecnico,
                email=colaborador_salvo.email,
                cft=colaborador_salvo.cft,
                limite_acesso=colaborador_salvo.limite_acesso,
                acesso_liberado=colaborador_salvo.acesso_liberado,
                status="Ativo" if colaborador_salvo.acesso_liberado else "Inativo",
            )
        except Exception as e:
            print(f"Erro ao criar colaborador: {str(e)}")
            raise
