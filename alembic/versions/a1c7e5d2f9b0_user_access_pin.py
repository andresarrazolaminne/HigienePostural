"""Clave de ingreso (PIN) por usuario para login simplificado.

Revision ID: a1c7e5d2f9b0
Revises: d9e4f1a2b3c4
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1c7e5d2f9b0"
down_revision: Union[str, None] = "d9e4f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("access_pin", sa.String(length=12), nullable=True))
    op.create_index("ix_users_access_pin", "users", ["access_pin"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_access_pin", table_name="users")
    op.drop_column("users", "access_pin")
