from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class CreateSupervisorDTO(BaseModel):
    name: str
    idendificador_profissional: str
    uf: str
    cidade: str
    email: EmailStr
    password: str


class SupervisorResponseDTO(BaseModel):
    id: int
    name: str
    idendificador_profissional: str
    uf: str
    cidade: str
    email: str
