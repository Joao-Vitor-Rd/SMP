"""Create user table

Revision ID: 11111111111a
Revises: 7b9c4d3a1f2e
Create Date: 2026-05-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '11111111111a'
down_revision: Union[str, Sequence[str], None] = '7b9c4d3a1f2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Criar ENUM para cargo usando PL/pgSQL para lidar com duplicatas
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE cargoenum AS ENUM ('supervisor', 'colaborador', 'tecnico');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Criar tabela user (sem passar postgresql.ENUM na coluna pra não tentar criar novamente)
    op.create_table('user',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('nome', sa.VARCHAR(length=150), nullable=False),
        sa.Column('email', sa.VARCHAR(length=150), nullable=False),
        sa.Column('cargo', sa.VARCHAR(length=50), nullable=False),  # Usar VARCHAR temporariamente
        sa.PrimaryKeyConstraint('id', name=op.f('user_pkey')),
        sa.UniqueConstraint('email', name=op.f('user_email_key'))
    )
    
    # Depois alterar a coluna para usar o ENUM
    op.execute("ALTER TABLE \"user\" ALTER COLUMN cargo TYPE cargoenum USING cargo::cargoenum")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('user')
    op.execute("DROP TYPE IF EXISTS cargoenum")
