"""Add unique constraint to colaborador cft

Revision ID: 7b9c4d3a1f2e
Revises: c58fc16ff8df
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7b9c4d3a1f2e'
down_revision: Union[str, Sequence[str], None] = 'c58fc16ff8df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        'colaborador_cft_key',
        'colaborador',
        ['cft']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('colaborador_cft_key', 'colaborador', type_='unique')
