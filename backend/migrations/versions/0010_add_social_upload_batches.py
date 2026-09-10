"""add social upload batches"""

from alembic import op
import sqlalchemy as sa


revision = "0010_add_social_upload_batches"
down_revision = "0009_add_banking_upload_batches"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "social_upload_batches",
        sa.Column("id", sa.String(128), nullable=False),
        sa.Column("case_id", sa.String(64), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("original_content_type", sa.String(128), nullable=True),
        sa.Column("original_file", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_social_upload_batches_case_id",
        "social_upload_batches",
        ["case_id"],
    )
    with op.batch_alter_table("social_records") as batch_op:
        batch_op.add_column(sa.Column("batch_id", sa.String(128), nullable=True))
        batch_op.create_foreign_key(
            "fk_social_records_batch_id",
            "social_upload_batches",
            ["batch_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("social_records") as batch_op:
        batch_op.drop_constraint(
            "fk_social_records_batch_id",
            type_="foreignkey",
        )
        batch_op.drop_column("batch_id")
    op.drop_index(
        "ix_social_upload_batches_case_id",
        table_name="social_upload_batches",
    )
    op.drop_table("social_upload_batches")
