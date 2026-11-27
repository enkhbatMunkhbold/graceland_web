"""Persist ministry document assets in the database.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
"""

from alembic import op
import sqlalchemy as sa


revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ministry_document_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_ministry_document_assets_slug',
        'ministry_document_assets',
        ['slug'],
    )


def downgrade():
    op.drop_index('ix_ministry_document_assets_slug', table_name='ministry_document_assets')
    op.drop_table('ministry_document_assets')
