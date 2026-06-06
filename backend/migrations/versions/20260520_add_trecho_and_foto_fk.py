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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    table_names = inspector.get_table_names()
    
    # 1. Cria a tabela trechos se ela não existir
    if "trechos" not in table_names:
        op.create_table(
            "trechos",
            sa.Column("id_trecho", sa.String(length=36), nullable=False),
            sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id_trecho"),
        )

    trecho_indexes = {index["name"] for index in inspector.get_indexes("trechos")}
    if op.f("ix_trechos_id_trecho") not in trecho_indexes:
        op.create_index(op.f("ix_trechos_id_trecho"), "trechos", ["id_trecho"], unique=False)

    # CORREÇÃO: Toda a lógica abaixo só roda SE a tabela 'fotos' já existir no banco de dados
    if "fotos" in table_names:
        fotos_columns = {column["name"] for column in inspector.get_columns("fotos")}
        if "trecho_id" not in fotos_columns:
            op.add_column("fotos", sa.Column("trecho_id", sa.String(length=36), nullable=True))

        fotos_indexes = {index["name"] for index in inspector.get_indexes("fotos")}
        if op.f("ix_fotos_trecho_id") not in fotos_indexes:
            op.create_index(op.f("ix_fotos_trecho_id"), "fotos", ["trecho_id"], unique=False)

        fotos_fks = {fk["name"] for fk in inspector.get_foreign_keys("fotos")}
        if "fk_fotos_trecho_id_treches" not in fotos_fks:  # Note o nome exato aqui se der erro
            op.create_foreign_key(
                "fk_fotos_trecho_id_trechos",
                "fotos",
                "trechos",
                ["trecho_id"],
                ["id_trecho"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    # CORREÇÃO: No downgrade, também só tentamos limpar 'fotos' se ela existir
    if "fotos" in table_names:
        fotos_fks = {fk["name"] for fk in inspector.get_foreign_keys("fotos")}
        if "fk_fotos_trecho_id_trechos" in fotos_fks:
            op.drop_constraint("fk_fotos_trecho_id_trechos", "fotos", type_="foreignkey")

        fotos_indexes = {index["name"] for index in inspector.get_indexes("fotos")}
        if op.f("ix_fotos_trecho_id") in fotos_indexes:
            op.drop_index(op.f("ix_fotos_trecho_id"), table_name="fotos")

        fotos_columns = {column["name"] for column in inspector.get_columns("fotos")}
        if "trecho_id" in fotos_columns:
            op.drop_column("fotos", "trecho_id")

    if "trechos" in table_names:
        trecho_indexes = {index["name"] for index in inspector.get_indexes("trechos")}
        if op.f("ix_trechos_id_trecho") in trecho_indexes:
            op.drop_index(op.f("ix_trechos_id_trecho"), table_name="trechos")

        op.drop_table("trechos")