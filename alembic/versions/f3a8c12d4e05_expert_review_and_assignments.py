"""Rol experto, asignaciones multi-empresa y revisión humana de informes IA.

Revision ID: f3a8c12d4e05
Revises: e8a1f03b2c90
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f3a8c12d4e05"
down_revision: Union[str, None] = "e8a1f03b2c90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "expert_company_assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "company_id", name="uq_expert_company"),
    )
    op.create_index("ix_expert_company_assignments_user_id", "expert_company_assignments", ["user_id"])
    op.create_index("ix_expert_company_assignments_company_id", "expert_company_assignments", ["company_id"])

    op.add_column(
        "assessments",
        sa.Column("review_status", sa.String(length=32), nullable=False, server_default="pending"),
    )
    op.add_column("assessments", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("assessments", sa.Column("reviewed_by_id", sa.Integer(), nullable=True))
    op.add_column("assessments", sa.Column("expert_calculated_score", sa.Float(), nullable=True))
    op.add_column("assessments", sa.Column("expert_primary_issue", sa.String(length=512), nullable=True))
    op.add_column("assessments", sa.Column("expert_vision_patch", sa.JSON(), nullable=True))
    op.add_column("assessments", sa.Column("expert_review_notes", sa.Text(), nullable=True))
    op.create_foreign_key(
        "fk_assessments_reviewed_by_id_users",
        "assessments",
        "users",
        ["reviewed_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_assessments_review_status", "assessments", ["review_status"])
    op.create_index("ix_assessments_reviewed_by_id", "assessments", ["reviewed_by_id"])

    # Informes históricos ya completados: marcar como aprobados (sin cola ficticia).
    op.execute(
        sa.text(
            """
            UPDATE assessments
            SET review_status = 'approved',
                reviewed_at = COALESCE(processed_at, created_at)
            WHERE processing_status = 'completed'
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_assessments_reviewed_by_id", table_name="assessments")
    op.drop_index("ix_assessments_review_status", table_name="assessments")
    op.drop_constraint("fk_assessments_reviewed_by_id_users", "assessments", type_="foreignkey")
    op.drop_column("assessments", "expert_review_notes")
    op.drop_column("assessments", "expert_vision_patch")
    op.drop_column("assessments", "expert_primary_issue")
    op.drop_column("assessments", "expert_calculated_score")
    op.drop_column("assessments", "reviewed_by_id")
    op.drop_column("assessments", "reviewed_at")
    op.drop_column("assessments", "review_status")
    op.drop_table("expert_company_assignments")
