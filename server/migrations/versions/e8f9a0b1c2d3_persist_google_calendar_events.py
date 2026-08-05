"""Persist Google Calendar events and synchronization state.

Revision ID: e8f9a0b1c2d3
Revises: c7d8e9f0a1b2
"""
from alembic import op
import sqlalchemy as sa

revision = 'e8f9a0b1c2d3'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('events') as batch_op:
        batch_op.add_column(sa.Column('source', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('external_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('external_updated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('external_link', sa.String(length=1000), nullable=True))
        batch_op.add_column(sa.Column('is_all_day', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('is_read_only', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.create_index('ix_events_source', ['source'], unique=False)
        batch_op.create_index('ix_events_external_id', ['external_id'], unique=True)

    op.create_table(
        'google_calendar_sync_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('calendar_id', sa.String(length=255), nullable=False),
        sa.Column('sync_token', sa.Text(), nullable=True),
        sa.Column('window_start', sa.DateTime(), nullable=True),
        sa.Column('window_end', sa.DateTime(), nullable=True),
        sa.Column('last_success_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('calendar_id'),
    )


def downgrade():
    op.drop_table('google_calendar_sync_states')
    with op.batch_alter_table('events') as batch_op:
        batch_op.drop_index('ix_events_external_id')
        batch_op.drop_index('ix_events_source')
        batch_op.drop_column('is_read_only')
        batch_op.drop_column('is_all_day')
        batch_op.drop_column('external_link')
        batch_op.drop_column('external_updated_at')
        batch_op.drop_column('external_id')
        batch_op.drop_column('source')
