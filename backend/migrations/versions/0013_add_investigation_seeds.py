"""add investigation seed metadata"""

from alembic import op
import sqlalchemy as sa


revision = "0013_add_investigation_seeds"
down_revision = "0012_preserve_audit_logs_on_case_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("evidence_types", sa.JSON(), nullable=True))
    op.add_column("cases", sa.Column("incident_end_date", sa.Date(), nullable=True))
    op.execute("UPDATE cases SET evidence_types = '[]' WHERE evidence_types IS NULL")
    op.alter_column("cases", "evidence_types", nullable=False)


def downgrade() -> None:
    op.drop_column("cases", "incident_end_date")
    op.drop_column("cases", "evidence_types")