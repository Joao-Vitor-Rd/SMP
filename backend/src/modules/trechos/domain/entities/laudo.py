from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, DateTime, String, ForeignKey, Integer,  Table, JSON
from sqlalchemy.orm import relationship

from src.shared.infrastructure.db import Base
from typing import Optional, List
from src.shared.domain.entities.user import User
from src.shared.enums.cargo_enum import CargoEnum
from src.modules.analise.domain.entities.deteccao import Deteccao

laudo_user_associacao = Table(
    'laudo_user',
    Base.metadata,
    Column('laudo_id', Integer, ForeignKey('laudo.id', ondelete="CASCADE"), primary_key=True),
    Column('user_id', Integer, ForeignKey('user.id', ondelete="CASCADE"), primary_key=True)
)

class LaudoORM(Base):
    __tablename__ = "laudo"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    data = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    responsavel = Column(String(150), nullable=False)
    credencial_responsavel = Column(String(150), nullable=False)
    usuarios = relationship(
        "UserORM",
        secondary=laudo_user_associacao,
        lazy="joined"
    )
    resumo = Column(JSON, nullable=False, default=dict)
    # Campos de publicação (US-14). `publicacao_resumo` é separado de `resumo`
    # para não colidir com o resumo de contagens usado na criação/listagem.
    publicado_em = Column(DateTime(timezone=True), nullable=True)
    publicacao_resumo = Column(JSON, nullable=True)

class UsuarioLaudo(BaseModel):
    nome: str
    cargo: CargoEnum
    id: int

    model_config = ConfigDict(from_attributes=True)

class Laudo(BaseModel):
    model_config = {"from_attributes": True}
    
    id: Optional[int] = None
    data: Optional[datetime] = None
    responsavel: str
    credencial_responsavel: str
    usuarios: list[UsuarioLaudo] = Field(default_factory=list)
    resumo: dict[str, int] = Field(default_factory=dict)
    # Status derivado de publicado_em: "rascunho" enquanto não publicado,
    # "concluido" depois de publicar_laudo(). É isso que o relatório usa
    # pra decidir se o laudo aparece na tela.
    status: str = "rascunho"
    publicado_em: Optional[datetime] = None
    publicacao_resumo: Optional[dict] = None
