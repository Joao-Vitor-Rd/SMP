from pydantic import BaseModel, ConfigDict, EmailStr


class PasswordResetRequestDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr


class PasswordResetConfirmDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    token: str
    nova_senha: str


class PasswordResetMessageDTO(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mensagem: str