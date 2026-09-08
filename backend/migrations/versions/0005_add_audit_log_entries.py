"""add audit log entries"""

from alembic import op
import sqlalchemy as sa

revision = "0005_add_audit_log_entries"
down_revision = "0004_add_case_investigation_details"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing_tables = set(inspector.get_table_names())
    if "audit_log_entries" not in existing_tables:
        op.create_table(
            "audit_log_entries",
            sa.Column("id", sa.String(length=128), nullable=False),
            sa.Column("case_id", sa.String(length=64), sa.ForeignKey("cases.id"), nullable=False),
            sa.Column("user", sa.String(length=128), nullable=False),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("entity_type", sa.String(length=64), nullable=False),
            sa.Column("entity_id", sa.String(length=128), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("details", sa.JSON, nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
    existing_indexes = {index["name"] for index in inspector.get_indexes("audit_log_entries")}
    if "ix_audit_log_entries_case_id" not in existing_indexes:
        op.create_index("ix_audit_log_entries_case_id", "audit_log_entries", ["case_id"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "audit_log_entries" in inspector.get_table_names():
        existing_indexes = {index["name"] for index in inspector.get_indexes("audit_log_entries")}
        if "ix_audit_log_entries_case_id" in existing_indexes:
            op.drop_index("ix_audit_log_entries_case_id", table_name="audit_log_entries")
        op.drop_table("audit_log_entries")
