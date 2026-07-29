"""Add daily jobs and staff role.

Revision ID: b6c7d8e9f0a1
Revises: a5b6c7d8e9f0
"""

from alembic import op
import sqlalchemy as sa


revision = 'b6c7d8e9f0a1'
down_revision = 'a5b6c7d8e9f0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column(
            'is_staff',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ))

    op.create_table(
        'daily_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_daily_jobs_job_date', 'daily_jobs', ['job_date'])


def downgrade():
    op.drop_index('ix_daily_jobs_job_date', table_name='daily_jobs')
    op.drop_table('daily_jobs')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_staff')
