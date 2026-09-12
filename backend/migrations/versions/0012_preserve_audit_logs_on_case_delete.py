"""preserve audit logs when cases are deleted"""

from alembic import op
import sqlalchemy as sa


revision = "0012_preserve_audit_logs_on_case_delete"
down_revision = "0011_add_ipdr_upload_batches"
branch_labels = None
depends_on = None


def _audit_log_table() -> sa.Table:
    metadata = sa.MetaData()
    return sa.Table(
        "audit_log_entries",
        metadata,
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("case_id", sa.String(length=64), nullable=True),
        sa.Column("user", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("details", sa.JSON, nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["cases.id"],
            name="fk_audit_log_entries_case_id_cases",
            ondelete="SET NULL",
        ),
    )


def _postgres_audit_fk_name(bind) -> str:
    constraint_name = bind.execute(
        sa.text(
            """
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = current_schema()
              AND tc.table_name = 'audit_log_entries'
              AND kcu.column_name = 'case_id'
              AND ccu.table_name = 'cases'
              AND ccu.column_name = 'id'
            """
        )
    ).scalar_one_or_none()

    if not constraint_name:
        raise RuntimeError(
            "Could not find audit_log_entries.case_id foreign key."
        )

    return constraint_name


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "sqlite":
        with op.batch_alter_table(
            "audit_log_entries",
            recreate="always",
            copy_from=_audit_log_table(),
        ) as batch_op:
            batch_op.alter_column(
                "case_id",
                existing_type=sa.String(length=64),
                nullable=True,
            )

        inspector = sa.inspect(bind)
        indexes = {
            index["name"]
            for index in inspector.get_indexes("audit_log_entries")
        }
        if "ix_audit_log_entries_case_id" not in indexes:
            op.create_index(
                "ix_audit_log_entries_case_id",
                "audit_log_entries",
                ["case_id"],
            )
        return

    if dialect == "postgresql":
        constraint_name = _postgres_audit_fk_name(bind)

        op.alter_column(
            "audit_log_entries",
            "case_id",
            existing_type=sa.String(length=64),
            nullable=True,
        )
        op.drop_constraint(
            constraint_name,
            "audit_log_entries",
            type_="foreignkey",
        )
        op.create_foreign_key(
            "fk_audit_log_entries_case_id_cases",
            "audit_log_entries",
            "cases",
            ["case_id"],
            ["id"],
            ondelete="SET NULL",
        )
        return

    raise RuntimeError(
        f"Unsupported database dialect for migration: {dialect}"
    )


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade requires an explicit policy for audit rows whose case_id is NULL."
    )
