"""add original report file blob"""

from alembic import op
import sqlalchemy as sa


revision = "0007_add_report_file_blob"
down_revision = "0006_add_report_records"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "report_records",
        sa.Column("original_filename", sa.String(255), nullable=True),
    )
    op.add_column(
        "report_records",
        sa.Column("original_content_type", sa.String(128), nullable=True),
    )
    op.add_column(
        "report_records",
        sa.Column("original_file", sa.LargeBinary(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("report_records", "original_file")
    op.drop_column("report_records", "original_content_type")
    op.drop_column("report_records", "original_filename")
