from src.modules.auth.application.dtos.login_dto import LoginDTO, LoginResponseDTO
from src.modules.auth.infrastructure.repositories.generic_user_repository import GenericUserRepository
from src.shared.security.password_hash import PassWordHasher
from src.shared.security.token_service import TokenService
from datetime import datetime, timezone, timedelta
from src.modules.auth.domain.repositories.i_limitador_tentativas import LimitadorDeTentativas
import asyncio


class LoginUseCase:
    def __init__(
            self,
            repository: GenericUserRepository,
            hasher: PassWordHasher,
            token_service: TokenService,
            limitador: LimitadorDeTentativas
        ):
        self.repository = repository
        self.hasher = hasher
        self.token_service = token_service
        self.limitador = limitador

    async def execute(self, login_data: LoginDTO, ip_user: str) -> LoginResponseDTO:
        # Verifica se está bloqueado por tentativas falhas (rate limiting)
        if await self.limitador.esta_bloqueado(ip_user):
            tentativas = await self.limitador.obter_tentativas(ip_user)
            raise ValueError(str(tentativas))
        
        # Buscar usuário (supervisor ou colaborador) em thread separado (DB sync)
        user_info = await asyncio.to_thread(self.repository.find_by_email, login_data.email)
        
        if not user_info:
            tentativas = await self.limitador.registrar_tentativa(ip_user)
            raise ValueError(str(tentativas))
        
        user = user_info["user"]
        user_type = user_info["user_type"]
        cargo = user_info["cargo"]
        password_field = user_info["password"]
        limite_acesso = user_info["limite_acesso"]
        acesso_liberado = user_info["acesso_liberado"]
        
        # Verificar senha
        if not self.hasher.verify(login_data.senha, password_field):
            tentativas = await self.limitador.registrar_tentativa(ip_user)
            raise ValueError(str(tentativas))
        
        # Reset de tentativas após login bem-sucedido
        await self.limitador.resetar(ip_user)
        
        # Verificação de acesso do colaborador
        if cargo == "colaborador":
            if not acesso_liberado:
                raise ValueError(f"Você não possui mais acesso ao sistema, entre em contato com seu supervisor")
            
            if limite_acesso is not None and datetime.now(timezone.utc) > limite_acesso:
                raise ValueError(f"Você não possui mais acesso ao sistema, entre em contato com seu supervisor")
        
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
                "identificador_profissional": user_info.get("identificador_profissional"),
                "crea": user_info.get("identificador_profissional"),
                "cft": user_info.get("cft"),
                "cargo": cargo
            }
        )
