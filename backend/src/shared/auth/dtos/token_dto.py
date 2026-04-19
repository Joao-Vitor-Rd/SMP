from pydantic import BaseModel, EmailStr


class LoginDTO(BaseModel):
    email: EmailStr
    password: str


class LoginResponseDTO(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenDTO(BaseModel):
    refresh_token: str


class RefreshTokenResponseDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"
