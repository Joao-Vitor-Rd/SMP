"""Change colaborador responsible FK to user

Revision ID: 20260519_fk_user
Revises: ae88784698ab
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260519_fk_user'
down_revision: Union[str, Sequence[str], None] = 'ae88784698ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Converte os IDs atualmente apontando para supervisor.id em user.id
    op.execute("""
        UPDATE colaborador c
        SET id_profissional_responsavel = s.user_id
        FROM supervisor s
        WHERE c.id_profissional_responsavel = s.id
    """)

    op.drop_constraint('colaborador_id_profissional_responsavel_fkey', 'colaborador', type_='foreignkey')
    op.create_foreign_key(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        'user',
        ['id_profissional_responsavel'],
        ['id'],
        ondelete=None,
    )


def downgrade() -> None:
    # Restaura o vínculo para supervisor.id quando possível
    op.execute("""
        UPDATE colaborador c
        SET id_profissional_responsavel = s.id
        FROM supervisor s
        WHERE c.id_profissional_responsavel = s.user_id
    """)

    op.drop_constraint('colaborador_id_profissional_responsavel_fkey', 'colaborador', type_='foreignkey')
    op.create_foreign_key(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        'supervisor',
        ['id_profissional_responsavel'],
        ['id'],
        ondelete=None,
    )
