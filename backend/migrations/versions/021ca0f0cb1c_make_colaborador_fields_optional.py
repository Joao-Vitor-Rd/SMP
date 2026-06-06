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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if 'supervisor' not in table_names:
        op.create_table(
            'supervisor',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('name', sa.String(length=150), nullable=False),
            sa.Column('idendificador_profissional', sa.String(length=20), nullable=False),
            sa.Column('uf', postgresql.ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', name='ufenum'), nullable=False),
            sa.Column('cidade', sa.String(length=50), nullable=False),
            sa.Column('email', sa.String(length=150), nullable=False),
            sa.Column('password', sa.String(length=255), nullable=False),
            sa.Column('tentativas_falhas', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('limite_de_bloqueio', postgresql.TIMESTAMP(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id', name=op.f('supervisor_pkey')),
            sa.UniqueConstraint('email', name=op.f('supervisor_email_key')),
            sa.UniqueConstraint('idendificador_profissional', name=op.f('supervisor_idendificador_profissional_key')),
        )

    if 'colaborador' not in table_names:
        op.create_table(
            'colaborador',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('nome', sa.String(length=150), nullable=False),
            sa.Column('id_profissional_responsavel', sa.String(length=20), nullable=False),
            sa.Column('uf', postgresql.ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', name='ufenum'), nullable=True),
            sa.Column('cidade', sa.String(length=50), nullable=True),
            sa.Column('email', sa.String(length=150), nullable=False),
            sa.Column('cft', sa.String(length=30), nullable=True),
            sa.Column('instituicao_ensino', sa.String(length=255), nullable=True),
            sa.Column('empresa_ou_orgao', sa.String(length=255), nullable=True),
            sa.Column('telefone', sa.String(length=20), nullable=True),
            sa.Column('is_tecnico', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('senha', sa.String(length=255), nullable=False),
            sa.Column('limite_acesso', postgresql.TIMESTAMP(timezone=True), nullable=True),
            sa.Column('acesso_liberado', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('tentativas_falhas', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('limite_de_bloqueio', postgresql.TIMESTAMP(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['id_profissional_responsavel'], ['supervisor.idendificador_profissional'], name=op.f('colaborador_id_profissional_responsavel_fkey')),
            sa.PrimaryKeyConstraint('id', name=op.f('colaborador_pkey')),
            sa.UniqueConstraint('email', name=op.f('colaborador_email_key')),
        )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if 'colaborador' in inspector.get_table_names():
        op.drop_table('colaborador')

    if 'supervisor' in inspector.get_table_names():
        op.drop_table('supervisor')
