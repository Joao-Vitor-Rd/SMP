"""Migrate colaborador to user

Revision ID: 33333333333c
Revises: 22222222222b
Create Date: 2026-05-11 10:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '33333333333c'
down_revision: Union[str, Sequence[str], None] = '22222222222b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - migrate colaborador data to user table"""
    # Inserir colaboradores na tabela user com cargo baseado em is_tecnico
    connection = op.get_bind()
    
    connection.execute(sa.text("""
        INSERT INTO "user" (nome, email, cargo)
        SELECT 
            nome, 
            email, 
            CASE WHEN is_tecnico THEN 'tecnico'::cargoenum ELSE 'colaborador'::cargoenum END
        FROM colaborador
        ON CONFLICT (email) DO NOTHING
    """))


def downgrade() -> None:
    """Downgrade schema - remove migrated colaborador data from user table"""
    connection = op.get_bind()
    
    connection.execute(sa.text("""
        DELETE FROM "user" WHERE cargo IN ('colaborador'::cargoenum, 'tecnico'::cargoenum)
    """))
