"""Make colaborador fields optional

Revision ID: 021ca0f0cb1c
Revises: 
Create Date: 2026-04-21 01:24:37.644894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '021ca0f0cb1c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ufenum AS ENUM (
                'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
                'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
                'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table('supervisor',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('name', sa.VARCHAR(length=150), nullable=False),
        sa.Column('idendificador_profissional', sa.VARCHAR(length=20), nullable=False),
        sa.Column('uf', postgresql.ENUM(name='ufenum', create_type=False), nullable=False),
        sa.Column('cidade', sa.VARCHAR(length=50), nullable=False),
        sa.Column('email', sa.VARCHAR(length=150), nullable=False),
        sa.Column('password', sa.VARCHAR(length=255), nullable=False),
        sa.Column('tentativas_falhas', sa.INTEGER(), nullable=False),
        sa.Column('limite_de_bloqueio', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('supervisor_pkey')),
        sa.UniqueConstraint('email', name=op.f('supervisor_email_key')),
        sa.UniqueConstraint('idendificador_profissional', name=op.f('supervisor_idendificador_profissional_key')),
    )

    op.create_table('colaborador',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('nome', sa.VARCHAR(length=150), nullable=False),
        sa.Column('id_profissional_responsavel', sa.VARCHAR(length=20), nullable=False),
        sa.Column('uf', postgresql.ENUM(name='ufenum', create_type=False), nullable=False),
        sa.Column('cidade', sa.VARCHAR(length=50), nullable=False),
        sa.Column('email', sa.VARCHAR(length=150), nullable=False),
        sa.Column('cft', sa.VARCHAR(length=30), nullable=True),
        sa.Column('instituicao_ensino', sa.VARCHAR(length=255), nullable=False),
        sa.Column('empresa_ou_orgao', sa.VARCHAR(length=255), nullable=False),
        sa.Column('telefone', sa.VARCHAR(length=20), nullable=False),
        sa.Column('is_tecnico', sa.BOOLEAN(), nullable=False),
        sa.Column('senha', sa.VARCHAR(length=255), nullable=False),
        sa.Column('limite_acesso', postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('acesso_liberado', sa.BOOLEAN(), nullable=False),
        sa.Column('tentativas_falhas', sa.INTEGER(), nullable=False),
        sa.Column('limite_de_bloqueio', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ['id_profissional_responsavel'],
            ['supervisor.idendificador_profissional'],
            name=op.f('colaborador_id_profissional_responsavel_fkey'),
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('colaborador_pkey')),
        sa.UniqueConstraint('email', name=op.f('colaborador_email_key')),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('colaborador')
    op.drop_table('supervisor')
    op.execute("DROP TYPE IF EXISTS ufenum")
