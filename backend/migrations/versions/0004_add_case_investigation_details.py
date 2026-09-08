"""add structured investigation details to cases"""

from alembic import op
import sqlalchemy as sa

revision = "0004_add_case_investigation_details"
down_revision = "0003_add_evidence_records"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("cases")}
    legacy_columns = (
        ("status", sa.String(length=16), "active"),
        ("priority", sa.String(length=16), "medium"),
        ("lead", sa.String(length=255), "Unassigned"),
        ("tags", sa.JSON(), "[]"),
    )
    for name, column_type, default in legacy_columns:
        if name not in existing_columns:
            op.add_column("cases", sa.Column(name, column_type, nullable=False, server_default=default))
    op.add_column("cases", sa.Column("case_type", sa.String(length=64), nullable=True))
    op.add_column("cases", sa.Column("description", sa.String(length=1000), nullable=True))
    op.add_column("cases", sa.Column("investigation_mode", sa.String(length=16), nullable=False, server_default="entity"))
    op.add_column("cases", sa.Column("seed_type", sa.String(length=32), nullable=True))
    op.add_column("cases", sa.Column("seed_value", sa.String(length=255), nullable=True))
    op.add_column("cases", sa.Column("evidence_type", sa.String(length=32), nullable=True))
    op.add_column("cases", sa.Column("incident_date", sa.Date(), nullable=True))
    op.add_column("cases", sa.Column("event_description", sa.String(length=1000), nullable=True))
    with op.batch_alter_table("cases") as batch_op:
        batch_op.alter_column("investigation_mode", server_default=None)


def downgrade() -> None:
    op.drop_column("cases", "event_description")
    op.drop_column("cases", "incident_date")
    op.drop_column("cases", "evidence_type")
    op.drop_column("cases", "seed_value")
    op.drop_column("cases", "seed_type")
    op.drop_column("cases", "investigation_mode")
    op.drop_column("cases", "description")
    op.drop_column("cases", "case_type")
