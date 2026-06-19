"""Notas profesionales por evaluación.

Revision ID: c4e91a2b7f03
Revises: b7f2c8d91e04
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4e91a2b7f03"
down_revision: Union[str, None] = "b7f2c8d91e04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("assessments", sa.Column("professional_notes", sa.Text(), nullable=True))
    op.add_column("assessments", sa.Column("notes_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("assessments", sa.Column("notes_author_id", sa.Integer(), nullable=True))
    op.create_index("ix_assessments_notes_author_id", "assessments", ["notes_author_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_assessments_notes_author_id", table_name="assessments")
    op.drop_column("assessments", "notes_author_id")
    op.drop_column("assessments", "notes_updated_at")
    op.drop_column("assessments", "professional_notes")
