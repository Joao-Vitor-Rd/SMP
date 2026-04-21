from pydantic import BaseModel, EmailStr, Field, ConfigDict


class LoginDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    email: EmailStr
    senha: str
    lembrar_me: bool = False


class LoginResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    token_acesso: str
    token_atualizacao: str
    tipo_token: str = "bearer"
    usuario: dict


class RefreshTokenDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    token_atualizacao: str


class RefreshTokenResponseDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    token_acesso: str
    tipo_token: str = "bearer"
