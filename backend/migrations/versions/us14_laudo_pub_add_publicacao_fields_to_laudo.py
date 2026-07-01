"""add_publicacao_fields_to_laudo

Revision ID: us14_laudo_pub
Revises: us14_deteccao
Create Date: 2026-06-27 23:31:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'us14_laudo_pub'
down_revision: Union[str, Sequence[str], None] = 'us14_deteccao'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('laudo', sa.Column('publicado_em', sa.DateTime(timezone=True), nullable=True))
    op.add_column('laudo', sa.Column('publicacao_resumo', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('laudo', 'publicacao_resumo')
    op.drop_column('laudo', 'publicado_em')
