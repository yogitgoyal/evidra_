"""create cases table"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_cases"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    for table, columns in {
        "cdr_records": [
            sa.Column("caller", sa.String(128), nullable=False), sa.Column("callee", sa.String(128), nullable=False),
            sa.Column("duration_seconds", sa.Integer, nullable=False),],
        "ipdr_records": [
            sa.Column("source_ip", sa.String(128), nullable=False), sa.Column("destination_ip", sa.String(128), nullable=False),
            sa.Column("protocol", sa.String(32), nullable=False),],
        "banking_records": [
            sa.Column("sender", sa.String(128), nullable=False), sa.Column("recipient", sa.String(128), nullable=False),
            sa.Column("amount", sa.Numeric(18, 2), nullable=False), sa.Column("channel", sa.String(32), nullable=False),],
        "social_records": [
            sa.Column("actor", sa.String(128), nullable=False), sa.Column("target", sa.String(128), nullable=False),
            sa.Column("platform", sa.String(64), nullable=False), sa.Column("interaction", sa.String(64), nullable=False),],
        "identity_records": [
            sa.Column("subject", sa.String(128), nullable=False), sa.Column("document_type", sa.String(64), nullable=False),
            sa.Column("document_hash", sa.String(256), nullable=False),],
    }.items():
        op.create_table(
            table,
            sa.Column("id", sa.String(128), nullable=False),
            sa.Column("case_id", sa.String(64), nullable=False),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attributes", sa.JSON, nullable=False),
            *columns,
            sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(f"ix_{table}_case_id", table, ["case_id"])


def downgrade() -> None:
    for table in ("identity_records", "social_records", "banking_records", "ipdr_records", "cdr_records"):
        op.drop_index(f"ix_{table}_case_id", table_name=table)
        op.drop_table(table)
    op.drop_table("cases")
