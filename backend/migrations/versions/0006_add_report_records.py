"""add report records"""

from alembic import op
import sqlalchemy as sa


revision = "0006_add_report_records"
down_revision = "0005_add_audit_log_entries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_records",
        sa.Column("id", sa.String(128), nullable=False),
        sa.Column("case_id", sa.String(64), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attributes", sa.JSON, nullable=False),
        sa.Column("raw_text", sa.String(100000), nullable=False),
        sa.Column("submitted_by", sa.String(128), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("extracted_entities", sa.JSON, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_records_case_id", "report_records", ["case_id"])


def downgrade() -> None:
    op.drop_index("ix_report_records_case_id", table_name="report_records")
    op.drop_table("report_records")
