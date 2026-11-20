"""Promote the existing Boojoo account to administrator and staff.

Revision ID: f9a0b1c2d3e4
Revises: e7f8a9b0c1d2
"""

from alembic import op
import sqlalchemy as sa


revision = 'f9a0b1c2d3e4'
down_revision = 'e7f8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade():
    users = sa.table(
        'users',
        sa.column('username', sa.String()),
        sa.column('is_admin', sa.Boolean()),
        sa.column('is_staff', sa.Boolean()),
    )
    op.execute(
        users.update()
        .where(users.c.username == 'Boojoo')
        .values(is_admin=True, is_staff=True)
    )


def downgrade():
    # Do not automatically revoke privileged roles during a rollback.
    pass
