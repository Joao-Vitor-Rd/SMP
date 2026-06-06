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
    # 1. Remove a FK antiga antes de alterar dados e tipos
    op.drop_constraint('colaborador_id_profissional_responsavel_fkey', 'colaborador', type_='foreignkey')

    # 2. Converte os IDs usando casting explícito (::INTEGER e ::VARCHAR) para evitar o erro do Postgres
    op.execute("""
        UPDATE colaborador c
        SET id_profissional_responsavel = s.user_id::VARCHAR
        FROM supervisor s
        WHERE c.id_profissional_responsavel::INTEGER = s.id
    """)

    # 3. Altera o tipo da coluna de VARCHAR para INTEGER (já que agora aponta para user.id)
    op.execute("""
        ALTER TABLE colaborador 
        ALTER COLUMN id_profissional_responsavel TYPE INTEGER 
        USING id_profissional_responsavel::INTEGER
    """)

    # 4. Cria a nova FK apontando para a tabela 'user'
    op.create_foreign_key(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        'user',
        ['id_profissional_responsavel'],
        ['id'],
        ondelete=None,
    )


def downgrade() -> None:
    # 1. Remove a FK nova
    op.drop_constraint('colaborador_id_profissional_responsavel_fkey', 'colaborador', type_='foreignkey')

    # 2. Altera o tipo da coluna de volta para VARCHAR temporariamente para aceitar dados antigos
    op.execute("""
        ALTER TABLE colaborador 
        ALTER COLUMN id_profissional_responsavel TYPE VARCHAR(20) 
        USING id_profissional_responsavel::VARCHAR
    """)

    # 3. Restaura o vínculo para supervisor.id usando os casts necessários
    op.execute("""
        UPDATE colaborador c
        SET id_profissional_responsavel = s.id::VARCHAR
        FROM supervisor s
        WHERE c.id_profissional_responsavel::INTEGER = s.user_id
    """)

    # 4. Cria de volta a FK apontando para 'supervisor'
    op.create_foreign_key(
        'colaborador_id_profissional_responsavel_fkey',
        'colaborador',
        'supervisor',
        ['id_profissional_responsavel'],
        ['id'],
        ondelete=None,
    )