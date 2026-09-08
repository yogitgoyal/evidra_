"""add persisted evidence provenance records"""

from alembic import op
import sqlalchemy as sa

revision = "0003_add_evidence_records"
down_revision = "0002_add_dataset_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "evidence_records",
        sa.Column("id", sa.String(128), nullable=False),
        sa.Column("case_id", sa.String(64), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("source_record_id", sa.String(128), nullable=False),
        sa.Column("rule", sa.String(128), nullable=False),
        sa.Column("transformation", sa.String(128), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("fields", sa.JSON, nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_records_case_id", "evidence_records", ["case_id"])


def downgrade() -> None:
    op.drop_index("ix_evidence_records_case_id", table_name="evidence_records")
    op.drop_table("evidence_records")
