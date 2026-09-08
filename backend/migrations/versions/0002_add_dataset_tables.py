"""add synthetic dataset tables"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_dataset_tables"
down_revision = "0001_create_cases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing_tables = set(sa.inspect(op.get_bind()).get_table_names())
    definitions = {
        "cdr_records": [sa.Column("caller", sa.String(128), nullable=False), sa.Column("callee", sa.String(128), nullable=False), sa.Column("duration_seconds", sa.Integer, nullable=False)],
        "ipdr_records": [sa.Column("source_ip", sa.String(128), nullable=False), sa.Column("destination_ip", sa.String(128), nullable=False), sa.Column("protocol", sa.String(32), nullable=False)],
        "banking_records": [sa.Column("sender", sa.String(128), nullable=False), sa.Column("recipient", sa.String(128), nullable=False), sa.Column("amount", sa.Numeric(18, 2), nullable=False), sa.Column("channel", sa.String(32), nullable=False)],
        "social_records": [sa.Column("actor", sa.String(128), nullable=False), sa.Column("target", sa.String(128), nullable=False), sa.Column("platform", sa.String(64), nullable=False), sa.Column("interaction", sa.String(64), nullable=False)],
        "identity_records": [sa.Column("subject", sa.String(128), nullable=False), sa.Column("document_type", sa.String(64), nullable=False), sa.Column("document_hash", sa.String(256), nullable=False)],
    }
    for table, columns in definitions.items():
        if table in existing_tables:
            continue
        op.create_table(
            table,
            sa.Column("id", sa.String(128), nullable=False),
            sa.Column("case_id", sa.String(64), sa.ForeignKey("cases.id"), nullable=False),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attributes", sa.JSON, nullable=False),
            *columns,
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(f"ix_{table}_case_id", table, ["case_id"])


def downgrade() -> None:
    # Revision 0001 already owns these tables in the current migration chain.
    # Its downgrade removes them after this revision is reverted.
    pass
