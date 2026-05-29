"""Add ministry page contents table

Revision ID: f4e5d6c7b8a9
Revises: d3f4a1b2c3d4
Create Date: 2025-05-22

"""
from alembic import op
import sqlalchemy as sa


revision = 'f4e5d6c7b8a9'
down_revision = 'd3f4a1b2c3d4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ministry_page_contents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('blocks', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )


def downgrade():
    op.drop_table('ministry_page_contents')
