"""platform_branding singleton table

Revision ID: d9e4f1a2b3c4
Revises: f3a8c12d4e05
Create Date: 2026-06-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9e4f1a2b3c4"
down_revision: Union[str, None] = "f3a8c12d4e05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platform_branding",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("app_name", sa.String(length=120), nullable=True),
        sa.Column("app_tagline", sa.String(length=200), nullable=True),
        sa.Column("logo_path", sa.String(length=512), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "INSERT INTO platform_branding (id, app_name, app_tagline) VALUES (1, 'Husky', 'Misión de campo')"
    )


def downgrade() -> None:
    op.drop_table("platform_branding")
