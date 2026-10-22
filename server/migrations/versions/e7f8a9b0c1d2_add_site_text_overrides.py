"""Add site text overrides

Revision ID: e7f8a9b0c1d2
Revises: e8f9a0b1c2d3
"""
from alembic import op
import sqlalchemy as sa


revision = 'e7f8a9b0c1d2'
down_revision = 'e8f9a0b1c2d3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'site_text_overrides',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('page_path', sa.String(length=255), nullable=False),
        sa.Column('element_key', sa.String(length=1000), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('page_path', 'element_key', 'language', name='uq_site_text_location'),
    )


def downgrade():
    op.drop_table('site_text_overrides')
