from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.shared.auth.dtos import LoginDTO, LoginResponseDTO
from src.shared.security.password_hash import PassWordHasher
from src.shared.security.token_service import TokenService
from datetime import datetime, timezone, timedelta


class LoginSupervisorUseCase:

    def __init__(
            self, 
            repository: ISupervisorRepository,
            hasher: PassWordHasher,
            token_service: TokenService
        ):
        self.repository = repository
        self.hasher = hasher
        self.token_service = token_service

    def execute(self, login_data: LoginDTO) -> LoginResponseDTO:

        # Buscar supervisor pelo email
        supervisor = self.repository.find_by_email(login_data.email)
        
        if not supervisor:
            raise ValueError("Email ou senha inválidos")
        
        # Verifica se está bloqueado
        if supervisor.is_locked():
            tempo_bloqueio_formatado = supervisor.limite_de_bloqueio.strftime("%d/%m/%Y %H:%M:%S")
            raise ValueError(f"Você atingiu o limite máximo de erros, tente novamente depois de: {tempo_bloqueio_formatado}")
        
        # Verificar senha
        if not self.hasher.verify(login_data.password, supervisor.password):
            
            if supervisor.tentativas_falhas >= 4:
                tempo_bloqueio = datetime.now(timezone.utc) + timedelta(minutes=15)
                self.repository.update_tempo_bloqueio(supervisor.id, tempo_bloqueio)
                tempo_bloqueio_formatado = tempo_bloqueio.strftime("%d/%m/%Y %H:%M:%S")
                raise ValueError(f"Você atingiu o limite máximo de erros, tente novamente depois de: {tempo_bloqueio_formatado}")
            
            self.repository.update_tentativas(supervisor.id, supervisor.tentativas_falhas + 1)
            raise ValueError("Email ou senha inválidos")
        
        self.repository.update_tentativas(supervisor.id, 0)
        self.repository.update_tempo_bloqueio(supervisor.id, None)
        
        # Gerar tokens JWT
        access_token = self.token_service.generate(supervisor)
        refresh_token = self.token_service.generate_refresh_token(supervisor)
        
        # Retornar resposta com tokens
        return LoginResponseDTO(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user={
                "id": supervisor.id,
                "name": supervisor.name,
                "email": supervisor.email,
            }
        )


