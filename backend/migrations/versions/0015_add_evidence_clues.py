"""add evidence clues to cases"""

from alembic import op
import sqlalchemy as sa


revision = "0015_add_evidence_clues"
down_revision = "0014_add_event_case_details"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("clue_type", sa.String(32), nullable=True))
    op.add_column("cases", sa.Column("clue_value", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "clue_value")
    op.drop_column("cases", "clue_type")