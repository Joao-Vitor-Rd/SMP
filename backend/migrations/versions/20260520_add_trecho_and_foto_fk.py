"""Add trechos table and relation with fotos

Revision ID: 20260520_add_trecho
Revises: 20260519_fk_user
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260520_add_trecho"
down_revision: Union[str, Sequence[str], None] = "20260519_fk_user"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trechos",
        sa.Column("id_trecho", sa.String(length=36), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id_trecho"),
    )
    op.create_index(op.f("ix_trechos_id_trecho"), "trechos", ["id_trecho"], unique=False)

    op.add_column("fotos", sa.Column("trecho_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_fotos_trecho_id"), "fotos", ["trecho_id"], unique=False)
    op.create_foreign_key(
        "fk_fotos_trecho_id_trechos",
        "fotos",
        "trechos",
        ["trecho_id"],
        ["id_trecho"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_fotos_trecho_id_trechos", "fotos", type_="foreignkey")
    op.drop_index(op.f("ix_fotos_trecho_id"), table_name="fotos")
    op.drop_column("fotos", "trecho_id")

    op.drop_index(op.f("ix_trechos_id_trecho"), table_name="trechos")
    op.drop_table("trechos")
