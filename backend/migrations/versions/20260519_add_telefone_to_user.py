"""Add telefone to user and remove telefone from supervisor/colaborador

Revision ID: 20260519_add_telefone_to_user
Revises: 11111111111a
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260519_add_telefone_to_user'
down_revision: Union[str, Sequence[str], None] = '11111111111a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adiciona coluna telefone na tabela user (nullable)
    op.add_column('user', sa.Column('telefone', sa.VARCHAR(length=20), nullable=True))
    # Cria constraint única em telefone
    op.create_unique_constraint(op.f('user_telefone_key'), 'user', ['telefone'])

    # Remove colunas telefone de supervisor e colaborador se existirem
    op.execute("""
    DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supervisor' AND column_name='telefone') THEN
            ALTER TABLE supervisor DROP COLUMN telefone;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='colaborador' AND column_name='telefone') THEN
            ALTER TABLE colaborador DROP COLUMN telefone;
        END IF;
    END$$;
    """)


def downgrade() -> None:
    # Recria colunas telefone em supervisor e colaborador como fallback
    op.execute("""
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supervisor' AND column_name='telefone') THEN
            ALTER TABLE supervisor ADD COLUMN telefone VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='colaborador' AND column_name='telefone') THEN
            ALTER TABLE colaborador ADD COLUMN telefone VARCHAR(20);
        END IF;
    END$$;
    """)

    # Remove constraint e coluna do user
    op.drop_constraint(op.f('user_telefone_key'), 'user', type_='unique')
    op.drop_column('user', 'telefone')
