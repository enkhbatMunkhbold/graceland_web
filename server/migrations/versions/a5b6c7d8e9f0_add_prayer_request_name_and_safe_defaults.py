"""Add prayer request name and privacy-safe defaults.

Revision ID: a5b6c7d8e9f0
Revises: f4e5d6c7b8a9
"""

from alembic import op
import sqlalchemy as sa


revision = 'a5b6c7d8e9f0'
down_revision = 'f4e5d6c7b8a9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('prayer_requests') as batch_op:
        batch_op.add_column(sa.Column(
            'name',
            sa.String(length=100),
            nullable=False,
            server_default='Anonymous',
        ))

    op.execute(
        "UPDATE prayer_requests "
        "SET status = CASE "
        "WHEN status = 'answered' THEN 'answered' "
        "ELSE 'new' END"
    )
    op.execute(
        "UPDATE prayer_requests SET is_public = 0 WHERE is_public IS NULL"
    )

    with op.batch_alter_table('prayer_requests') as batch_op:
        batch_op.alter_column(
            'is_public',
            existing_type=sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        )
        batch_op.alter_column(
            'status',
            existing_type=sa.String(length=20),
            nullable=False,
            server_default='new',
        )


def downgrade():
    with op.batch_alter_table('prayer_requests') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.String(length=20),
            nullable=True,
            server_default=None,
        )
        batch_op.alter_column(
            'is_public',
            existing_type=sa.Boolean(),
            nullable=True,
            server_default=None,
        )
        batch_op.drop_column('name')
