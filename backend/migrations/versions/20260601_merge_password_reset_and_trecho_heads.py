"""merge password reset and trecho heads

Revision ID: 20260601_merge_prs_trch
Revises: 20260520_add_trecho, 20260531_prs_token
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260601_merge_prs_trch"
down_revision: Union[str, Sequence[str], None] = (
    "20260520_add_trecho",
    "20260531_prs_token",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass