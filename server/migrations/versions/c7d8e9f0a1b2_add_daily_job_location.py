"""Add daily job location.

Revision ID: c7d8e9f0a1b2
Revises: b6c7d8e9f0a1
"""

from alembic import op
import sqlalchemy as sa


revision = 'c7d8e9f0a1b2'
down_revision = 'b6c7d8e9f0a1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('daily_jobs') as batch_op:
        batch_op.add_column(sa.Column('location', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('daily_jobs') as batch_op:
        batch_op.drop_column('location')
