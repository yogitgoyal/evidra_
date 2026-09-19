"""add optional event case details"""

from alembic import op
import sqlalchemy as sa


revision = "0014_add_event_case_details"
down_revision = "0013_add_investigation_seeds"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("incident_start_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("cases", sa.Column("incident_end_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("cases", sa.Column("event_location", sa.String(length=1000), nullable=True))
    op.add_column("cases", sa.Column("event_lat", sa.Float(), nullable=True))
    op.add_column("cases", sa.Column("event_lng", sa.Float(), nullable=True))
    op.add_column("cases", sa.Column("event_radius_m", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "event_radius_m")
    op.drop_column("cases", "event_lng")
    op.drop_column("cases", "event_lat")
    op.drop_column("cases", "event_location")
    op.drop_column("cases", "incident_end_time")
    op.drop_column("cases", "incident_start_time")