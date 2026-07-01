"""add_resumo_and_credencial_to_laudo

Revision ID: 20260609_add_laudo_fields
Revises: cebc224e0ced
Create Date: 2026-06-09 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.

revision: str = '20260609_add_laudo_fields'
down_revision: Union[str, Sequence[str], None] = 'cebc224e0ced'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        'laudo',
        sa.Column(
            'credencial_responsavel',
            sa.String(length=150),
            nullable=True
        )
    )

    op.add_column(
        'laudo',
        sa.Column(
            'resumo',
            sa.JSON(),
            nullable=False,
            server_default='{}'
        )
    )

    op.execute(
        """
        UPDATE laudo
        SET credencial_responsavel = ''
        WHERE credencial_responsavel IS NULL
        """
    )

    op.alter_column(
        'laudo',
        'credencial_responsavel',
        nullable=False
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column('laudo', 'resumo')
    op.drop_column('laudo', 'credencial_responsavel')