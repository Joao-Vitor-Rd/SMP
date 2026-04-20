import os
from dotenv import load_dotenv
from jose import jwt, JWTError
from src.shared.security.token_service import TokenService
from datetime import datetime, timezone, timedelta

load_dotenv()

SECRET = os.getenv("SECRET_KEY_JWT")
ALGORITHM = os.getenv("ALGORITHM")

if not SECRET or not ALGORITHM:
    raise ValueError("SECRET_KEY_JWT e ALGORITHM devem estar definidos nas variáveis de ambiente")

class JWTService(TokenService):

    def generate(self, user, lembrar_me: bool = False) -> str:
        payload = {
            "sub": str(user.id),
            "role": "supervisor",
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

    def generate_refresh_token(self, user, lembrar_me: bool = False) -> str:
        dias_expiracao = 30 if lembrar_me else 0
        horas_expiracao = 0 if lembrar_me else 8
        
        payload = {
            "sub": str(user.id),
            "role": "supervisor",
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=dias_expiracao, hours=horas_expiracao),
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

    def decode(self, token: str) -> dict:
        try:
            return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        except JWTError as e:
            raise JWTError(f"Erro ao decodificar token: {str(e)}")

    def refresh_access_token(self, refresh_token: str) -> str:
        try:
            payload = self.decode(refresh_token)
            
            if payload.get("type") != "refresh":
                raise JWTError("Token inválido: não é um refresh token")
            
            new_payload = {
                "sub": payload.get("sub"),
                "role": payload.get("role"),
                "type": "access",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
                "iat": datetime.now(timezone.utc),
            }
            
            return jwt.encode(new_payload, SECRET, algorithm=ALGORITHM)
        except JWTError as e:
            raise JWTError(f"Erro ao renovar token: {str(e)}")
