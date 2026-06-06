"""Change colaborador FK to use supervisor id

Revision ID: c58fc16ff8df
Revises: 021ca0f0cb1c
Create Date: 2026-04-21 01:30:18.501624

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c58fc16ff8df'
down_revision: Union[str, Sequence[str], None] = '021ca0f0cb1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        type_='foreignkey',
    )

    op.execute("""
        UPDATE colaborador c
        SET id_profissional_responsavel = s.id::text
        FROM supervisor s
        WHERE c.id_profissional_responsavel = s.idendificador_profissional
    """)

    op.alter_column(
        'colaborador',
        'id_profissional_responsavel',
        existing_type=sa.VARCHAR(length=20),
        type_=sa.INTEGER(),
        postgresql_using='id_profissional_responsavel::integer',
        nullable=False,
    )

    op.alter_column('colaborador', 'uf', existing_type=postgresql.ENUM(name='ufenum'), nullable=True)
    op.alter_column('colaborador', 'cidade', existing_type=sa.VARCHAR(length=50), nullable=True)
    op.alter_column('colaborador', 'instituicao_ensino', existing_type=sa.VARCHAR(length=255), nullable=True)
    op.alter_column('colaborador', 'empresa_ou_orgao', existing_type=sa.VARCHAR(length=255), nullable=True)
    op.alter_column('colaborador', 'telefone', existing_type=sa.VARCHAR(length=20), nullable=True)
    op.alter_column('colaborador', 'senha', existing_type=sa.VARCHAR(length=255), nullable=True)
    op.alter_column(
        'colaborador',
        'limite_acesso',
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=True,
    )

    op.create_foreign_key(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        'supervisor',
        ['id_profissional_responsavel'],
        ['id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        type_='foreignkey',
    )

    op.alter_column(
        'colaborador',
        'id_profissional_responsavel',
        existing_type=sa.INTEGER(),
        type_=sa.VARCHAR(length=20),
        postgresql_using='id_profissional_responsavel::varchar',
        nullable=False,
    )

    op.execute("""
        UPDATE colaborador c
        SET id_profissional_responsavel = s.idendificador_profissional
        FROM supervisor s
        WHERE c.id_profissional_responsavel = s.id::text
    """)

    op.alter_column('colaborador', 'uf', existing_type=postgresql.ENUM(name='ufenum'), nullable=False)
    op.alter_column('colaborador', 'cidade', existing_type=sa.VARCHAR(length=50), nullable=False)
    op.alter_column('colaborador', 'instituicao_ensino', existing_type=sa.VARCHAR(length=255), nullable=False)
    op.alter_column('colaborador', 'empresa_ou_orgao', existing_type=sa.VARCHAR(length=255), nullable=False)
    op.alter_column('colaborador', 'telefone', existing_type=sa.VARCHAR(length=20), nullable=False)
    op.alter_column('colaborador', 'senha', existing_type=sa.VARCHAR(length=255), nullable=False)
    op.alter_column(
        'colaborador',
        'limite_acesso',
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=False,
    )

    op.create_foreign_key(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        'supervisor',
        ['id_profissional_responsavel'],
        ['idendificador_profissional'],
    )
