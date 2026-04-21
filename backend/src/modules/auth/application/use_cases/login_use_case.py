from src.modules.auth.application.dtos.login_dto import LoginDTO, LoginResponseDTO
from src.modules.auth.infrastructure.repositories.generic_user_repository import GenericUserRepository
from src.shared.security.password_hash import PassWordHasher
from src.shared.security.token_service import TokenService
from datetime import datetime, timezone, timedelta


class LoginUseCase:
    def __init__(
            self,
            repository: GenericUserRepository,
            hasher: PassWordHasher,
            token_service: TokenService
        ):
        self.repository = repository
        self.hasher = hasher
        self.token_service = token_service

    def execute(self, login_data: LoginDTO) -> LoginResponseDTO:
        # Buscar usuário (supervisor ou colaborador)
        user_info = self.repository.find_by_email(login_data.email)
        
        if not user_info:
            raise ValueError("Email ou senha inválidos")
        
        user = user_info["user"]
        user_type = user_info["user_type"]
        cargo = user_info["cargo"]
        password_field = user_info["password"]
        limite_acesso = user_info["limite_acesso"]
        acesso_liberado = user_info["acesso_liberado"]
        
        # Verifica se está bloqueado
        if self._is_locked(user):
            tempo_bloqueio_formatado = user.limite_de_bloqueio.strftime("%H:%M:%S %d/%m/%Y")
            raise ValueError(f"Você atingiu o limite máximo de erros, tente novamente depois de: {tempo_bloqueio_formatado}")
        
        # Verificação de acesso do colaborador não tecnico
        if (cargo == "colaborador" and  datetime.now(timezone.utc) < limite_acesso) or (cargo == "colaborador" and (not acesso_liberado)):
            raise ValueError(f"Você não possui mais acesso ao sistema, entre em contato com seu supervisor")
        
        # Verificar senha
        if not self.hasher.verify(login_data.senha, password_field):
            
            if user.tentativas_falhas >= 4:
                tempo_bloqueio = datetime.now(timezone.utc) + timedelta(minutes=15)
                self.repository.update_lock_time(user_type, user.id, tempo_bloqueio)
                tempo_bloqueio_formatado = tempo_bloqueio.strftime("%d/%m/%Y %H:%M:%S")
                raise ValueError(f"Você atingiu o limite máximo de erros, tente novamente depois de: {tempo_bloqueio_formatado}")
            
            self.repository.update_failed_attempts(user_type, user.id, user.tentativas_falhas + 1)
            raise ValueError("Email ou senha inválidos")
        
        # Reset tentativas e limite de bloqueio
        self.repository.update_failed_attempts(user_type, user.id, 0)
        self.repository.update_lock_time(user_type, user.id, None)
        
        # Gerar tokens JWT
        access_token = self.token_service.generate(user, cargo, login_data.lembrar_me)
        refresh_token = self.token_service.generate_refresh_token(user, cargo, login_data.lembrar_me)
        
        # Retornar resposta com tokens
        return LoginResponseDTO(
            token_acesso=access_token,
            token_atualizacao=refresh_token,
            tipo_token="bearer",
            usuario={
                "id": user.id,
                "nome": user_info["nome"],
                "email": user.email,
                "role": cargo,
                "tipo": user_type
            }
        )
    
    def _is_locked(self, user) -> bool:
        if user.limite_de_bloqueio is None:
            return False
        return datetime.now(timezone.utc) < user.limite_de_bloqueio
