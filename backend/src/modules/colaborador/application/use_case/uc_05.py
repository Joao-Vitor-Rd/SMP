from src.modules.supervisor.domain.entities.supervisor import Supervisor
from src.modules.supervisor.domain.repositories.ISupervisorRepository import ISupervisorRepository
from src.modules.auth.application.dtos.login_dto import LoginDTO, LoginResponseDTO
from src.shared.security.password_hash import PassWordHasher
from src.shared.security.token_service import TokenService
from src.shared.enums.cargo_enum import CargoEnum
from datetime import datetime, timezone, timedelta


class LoginColaboradorUseCase:

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
        colaborador = self.repository.find_by_email(login_data.email)
        
        if not colaborador:
            raise ValueError("Email ou senha inválidos")
        
        # Verifica se está bloqueado
        if colaborador.is_locked():
            tempo_bloqueio_formatado = colaborador.limite_de_bloqueio.strftime("%H:%M:%S %d/%m/%Y")
            raise ValueError(f"Você atingiu o limite máximo de erros, tente novamente depois de: {tempo_bloqueio_formatado}")
        
        # Verificar senha
        if not self.hasher.verify(login_data.senha, colaborador.password):
            
            if colaborador.tentativas_falhas >= 4:
                tempo_bloqueio = datetime.now(timezone.utc) + timedelta(minutes=15)
                self.repository.update_tempo_bloqueio(colaborador.id, tempo_bloqueio)
                tempo_bloqueio_formatado = tempo_bloqueio.strftime("%d/%m/%Y %H:%M:%S")
                raise ValueError(f"Você atingiu o limite máximo de erros, tente novamente depois de: {tempo_bloqueio_formatado}")
            
            self.repository.update_tentativas(colaborador.id, colaborador.tentativas_falhas + 1)
            raise ValueError("Email ou senha inválidos")
        
        self.repository.update_tentativas(colaborador.id, 0)
        self.repository.update_tempo_bloqueio(colaborador.id, None)
        
        # Gerar tokens JWT com base em "Lembrar-me"
        access_token = self.token_service.generate(colaborador, CargoEnum.COLABORADOR.value, login_data.lembrar_me)
        refresh_token = self.token_service.generate_refresh_token(colaborador, CargoEnum.COLABORADOR.value, login_data.lembrar_me)
        
        # Retornar resposta com tokens
        return LoginResponseDTO(
            token_acesso=access_token,
            token_atualizacao=refresh_token,
            tipo_token="bearer",
            usuario={
                "id": colaborador.id,
                "nome": colaborador.name,
                "email": colaborador.email,
                "role": CargoEnum.COLABORADOR
            }
        )


