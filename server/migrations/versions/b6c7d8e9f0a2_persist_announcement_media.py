"""Persist official announcement media in the database.

Revision ID: b6c7d8e9f0a2
Revises: a5b6c7d8e9f0
"""

from alembic import op
import sqlalchemy as sa


revision = 'b6c7d8e9f0a2'
down_revision = 'a5b6c7d8e9f0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'announcement_media',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('announcement_media')
