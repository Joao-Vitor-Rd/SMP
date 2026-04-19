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

    def generate(self, user) -> str:
        payload = {
            "sub": user.id,
            "role": "supervisor",
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

    def generate_refresh_token(self, user) -> str:
        payload = {
            "sub": user.id,
            "role": "supervisor",
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

    def decode(self, token: str) -> dict:
        try:
            return jwt.decode(token, SECRET, ALGORITHM)
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
