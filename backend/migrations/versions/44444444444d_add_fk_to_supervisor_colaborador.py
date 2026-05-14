"""Add user_id foreign keys

Revision ID: 44444444444d
Revises: 33333333333c
Create Date: 2026-05-11 10:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '44444444444d'
down_revision: Union[str, Sequence[str], None] = '33333333333c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add user_id foreign keys"""
    connection = op.get_bind()
    
    # Adicionar coluna user_id em supervisor
    op.add_column('supervisor', sa.Column('user_id', sa.Integer(), nullable=True))
    
    # Adicionar coluna user_id em colaborador
    op.add_column('colaborador', sa.Column('user_id', sa.Integer(), nullable=True))
    
    # Popular user_id em supervisor buscando pelo email
    connection.execute(sa.text("""
        UPDATE supervisor s
        SET user_id = u.id
        FROM "user" u
        WHERE s.email = u.email AND u.cargo = 'supervisor'::cargoenum
    """))
    
    # Popular user_id em colaborador buscando pelo email
    connection.execute(sa.text("""
        UPDATE colaborador c
        SET user_id = u.id
        FROM "user" u
        WHERE c.email = u.email AND (u.cargo = 'colaborador'::cargoenum OR u.cargo = 'tecnico'::cargoenum)
    """))
    
    # Tornar user_id NOT NULL
    op.alter_column('supervisor', 'user_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('colaborador', 'user_id', existing_type=sa.Integer(), nullable=False)
    
    # Adicionar FK constraints
    op.create_foreign_key(
        op.f('supervisor_user_id_fkey'),
        'supervisor', 'user',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        op.f('colaborador_user_id_fkey'),
        'colaborador', 'user',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema - remove user_id foreign keys"""
    op.drop_constraint(op.f('supervisor_user_id_fkey'), 'supervisor', type_='foreignkey')
    op.drop_constraint(op.f('colaborador_user_id_fkey'), 'colaborador', type_='foreignkey')
    
    op.drop_column('supervisor', 'user_id')
    op.drop_column('colaborador', 'user_id')
