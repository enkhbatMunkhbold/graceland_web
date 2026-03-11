"""Add sermon external_id and source for Facebook sync

Revision ID: b2a1c0d0e1f2
Revises: c41e3481f387
Create Date: 2025-03-10

"""
from alembic import op
import sqlalchemy as sa


revision = 'b2a1c0d0e1f2'
down_revision = 'c41e3481f387'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('sermons', sa.Column('external_id', sa.String(length=100), nullable=True))
    op.add_column('sermons', sa.Column('source', sa.String(length=50), nullable=True))


def downgrade():
    op.drop_column('sermons', 'source')
    op.drop_column('sermons', 'external_id')
