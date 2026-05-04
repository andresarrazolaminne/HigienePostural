"""companies_sites_session_site_assessment_created

Revision ID: 3c1ea9bbb771
Revises: dfe923e5ab3d
Create Date: 2026-05-04 10:25:11.824530

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3c1ea9bbb771"
down_revision: Union[str, None] = "dfe923e5ab3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(bind, name: str) -> bool:
    r = bind.execute(
        sa.text("SELECT 1 FROM sqlite_master WHERE type='table' AND name=:n"),
        {"n": name},
    ).fetchone()
    return r is not None


def _column_exists(bind, table: str, col: str) -> bool:
    rows = bind.execute(sa.text(f"PRAGMA table_info({table})")).fetchall()
    return any(row[1] == col for row in rows)


def upgrade() -> None:
    bind = op.get_bind()

    if not _table_exists(bind, "companies"):
        op.create_table(
            "companies",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_companies_name"), "companies", ["name"], unique=False)

    if not _table_exists(bind, "sites"):
        op.create_table(
            "sites",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("address", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_sites_company_id"), "sites", ["company_id"], unique=False)

    if not _column_exists(bind, "assessments", "created_at"):
        op.add_column(
            "assessments",
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
        )

    if not _column_exists(bind, "sessions", "site_id"):
        with op.batch_alter_table("sessions", schema=None) as batch_op:
            batch_op.add_column(sa.Column("site_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_sessions_site_id_sites",
                "sites",
                ["site_id"],
                ["id"],
                ondelete="RESTRICT",
            )
            batch_op.create_index("ix_sessions_site_id", ["site_id"], unique=False)

    if not _column_exists(bind, "users", "company_id"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.add_column(sa.Column("company_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_users_company_id_companies",
                "companies",
                ["company_id"],
                ["id"],
                ondelete="SET NULL",
            )
            batch_op.create_index("ix_users_company_id", ["company_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _column_exists(bind, "users", "company_id"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_index("ix_users_company_id")
            batch_op.drop_constraint("fk_users_company_id_companies", type_="foreignkey")
            batch_op.drop_column("company_id")

    if _column_exists(bind, "sessions", "site_id"):
        with op.batch_alter_table("sessions", schema=None) as batch_op:
            batch_op.drop_index("ix_sessions_site_id")
            batch_op.drop_constraint("fk_sessions_site_id_sites", type_="foreignkey")
            batch_op.drop_column("site_id")

    if _column_exists(bind, "assessments", "created_at"):
        op.drop_column("assessments", "created_at")

    if _table_exists(bind, "sites"):
        op.drop_index(op.f("ix_sites_company_id"), table_name="sites")
        op.drop_table("sites")

    if _table_exists(bind, "companies"):
        op.drop_index(op.f("ix_companies_name"), table_name="companies")
        op.drop_table("companies")
