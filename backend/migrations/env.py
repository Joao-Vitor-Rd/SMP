from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Importar Base do projeto
from src.shared.infrastructure.db import Base

# Importar todas as entidades para que o alembic as reconheça
from src.shared.domain.entities.user import UserORM
from src.modules.supervisor.domain.entities.supervisor import SupervisorORM
from src.modules.colaborador.domain.entities.colaborador import ColaboradorORM
from src.modules.auth.domain.entities.password_reset_token import PasswordResetTokenORM
from src.modules.fotos.domain.entities.fotos import fotosORM
from src.modules.trechos.domain.entities.trecho import TrechoORM
from src.modules.trechos.domain.entities.laudo import LaudoORM

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = os.getenv("DATABASE_URL")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = os.getenv("DATABASE_URL")
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
