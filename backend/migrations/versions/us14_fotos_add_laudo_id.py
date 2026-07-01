"""add laudo_id to fotos for inspection-scoped analysis

Revision ID: us14_fotos_laudo
Revises: us14_laudo_pub
Create Date: 2026-06-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "us14_fotos_laudo"
down_revision: Union[str, Sequence[str], None] = "us14_laudo_pub"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if "fotos" not in table_names:
        return

    fotos_columns = {column["name"] for column in inspector.get_columns("fotos")}

    if "laudo_id" not in fotos_columns:
        op.add_column("fotos", sa.Column("laudo_id", sa.Integer(), nullable=True))

    fotos_indexes = {index["name"] for index in inspector.get_indexes("fotos")}
    if "ix_fotos_laudo_id" not in fotos_indexes:
        op.create_index("ix_fotos_laudo_id", "fotos", ["laudo_id"], unique=False)

    fotos_fks = {fk["name"] for fk in inspector.get_foreign_keys("fotos")}
    if "fk_fotos_laudo_id_laudo" not in fotos_fks:
        op.create_foreign_key(
            "fk_fotos_laudo_id_laudo",
            "fotos",
            "laudo",
            ["laudo_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if "fotos" not in table_names:
        return

    fotos_fks = {fk["name"] for fk in inspector.get_foreign_keys("fotos")}
    if "fk_fotos_laudo_id_laudo" in fotos_fks:
        op.drop_constraint("fk_fotos_laudo_id_laudo", "fotos", type_="foreignkey")

    fotos_indexes = {index["name"] for index in inspector.get_indexes("fotos")}
    if "ix_fotos_laudo_id" in fotos_indexes:
        op.drop_index("ix_fotos_laudo_id", table_name="fotos")

    fotos_columns = {column["name"] for column in inspector.get_columns("fotos")}
    if "laudo_id" in fotos_columns:
        op.drop_column("fotos", "laudo_id")
