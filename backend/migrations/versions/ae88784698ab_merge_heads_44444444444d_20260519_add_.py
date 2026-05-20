"""merge heads 44444444444d & 20260519_add_telefone_to_user

Revision ID: ae88784698ab
Revises: 44444444444d, 20260519_add_telefone_to_user
Create Date: 2026-05-19 23:38:58.661163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ae88784698ab'
down_revision: Union[str, Sequence[str], None] = ('44444444444d', '20260519_add_telefone_to_user')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
