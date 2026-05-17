"""Migrate supervisor to user

Revision ID: 22222222222b
Revises: 11111111111a
Create Date: 2026-05-11 10:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '22222222222b'
down_revision: Union[str, Sequence[str], None] = '11111111111a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - migrate supervisor data to user table"""
    # Inserir supervisors na tabela user
    connection = op.get_bind()
    
    connection.execute(sa.text("""
        INSERT INTO "user" (nome, email, cargo)
        SELECT name, email, 'supervisor'::cargoenum FROM supervisor
        ON CONFLICT (email) DO NOTHING
    """))


def downgrade() -> None:
    """Downgrade schema - remove migrated supervisor data from user table"""
    connection = op.get_bind()
    
    connection.execute(sa.text("""
        DELETE FROM "user" WHERE cargo = 'supervisor'::cargoenum
    """))
