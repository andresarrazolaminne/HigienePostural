"""Migrar rol operator -> user y habilitar company_admin.

Revision ID: b7f2c8d91e04
Revises: 3c1ea9bbb771
Create Date: 2026-06-01
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b7f2c8d91e04"
down_revision: Union[str, None] = "3c1ea9bbb771"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'user' WHERE role = 'operator'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'operator' WHERE role = 'user'")
    op.execute("UPDATE users SET role = 'operator' WHERE role = 'company_admin'")
