"""create_deteccao_table

Revision ID: us14_deteccao
Revises: 871a69aff77d
Create Date: 2026-06-27 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'us14_deteccao'
down_revision: Union[str, Sequence[str], None] = '871a69aff77d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'deteccao',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('inspecao_id', sa.Integer(), nullable=False),
        sa.Column('defeito', sa.String(length=50), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('severidade', sa.String(length=50), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('imagem_id', sa.Integer(), nullable=True),
        sa.Column('revisado_manualmente', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['inspecao_id'], ['laudo.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_deteccao_id'), 'deteccao', ['id'], unique=False)
    op.create_index(op.f('ix_deteccao_inspecao_id'), 'deteccao', ['inspecao_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_deteccao_inspecao_id'), table_name='deteccao')
    op.drop_index(op.f('ix_deteccao_id'), table_name='deteccao')
    op.drop_table('deteccao')
