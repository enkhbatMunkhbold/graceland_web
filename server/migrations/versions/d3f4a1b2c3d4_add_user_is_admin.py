"""Add is_admin to users

Revision ID: d3f4a1b2c3d4
Revises: b2a1c0d0e1f2
Create Date: 2025-05-22

"""
from alembic import op
import sqlalchemy as sa


revision = 'd3f4a1b2c3d4'
down_revision = ('b2a1c0d0e1f2', 'e67db893abca')
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_admin')
