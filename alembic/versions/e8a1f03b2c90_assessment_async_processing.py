"""Estado de procesamiento asíncrono en assessments.

Revision ID: e8a1f03b2c90
Revises: c4e91a2b7f03
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "e8a1f03b2c90"
down_revision: Union[str, None] = "c4e91a2b7f03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(bind, table: str, col: str) -> bool:
    return col in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    if not _column_exists(bind, "assessments", "processing_status"):
        op.add_column(
            "assessments",
            sa.Column("processing_status", sa.String(length=32), nullable=False, server_default="completed"),
        )
    if not _column_exists(bind, "assessments", "processing_error"):
        op.add_column("assessments", sa.Column("processing_error", sa.Text(), nullable=True))
    if not _column_exists(bind, "assessments", "processed_at"):
        op.add_column("assessments", sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("assessments", schema=None) as batch_op:
        batch_op.alter_column("calculated_score", existing_type=sa.Float(), nullable=True)
        batch_op.alter_column("primary_issue", existing_type=sa.String(length=512), nullable=True)
        batch_op.alter_column("raw_ai_json", existing_type=sa.JSON(), nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    with op.batch_alter_table("assessments", schema=None) as batch_op:
        batch_op.alter_column("raw_ai_json", existing_type=sa.JSON(), nullable=False)
        batch_op.alter_column("primary_issue", existing_type=sa.String(length=512), nullable=False)
        batch_op.alter_column("calculated_score", existing_type=sa.Float(), nullable=False)
    if _column_exists(bind, "assessments", "processed_at"):
        op.drop_column("assessments", "processed_at")
    if _column_exists(bind, "assessments", "processing_error"):
        op.drop_column("assessments", "processing_error")
    if _column_exists(bind, "assessments", "processing_status"):
        op.drop_column("assessments", "processing_status")
