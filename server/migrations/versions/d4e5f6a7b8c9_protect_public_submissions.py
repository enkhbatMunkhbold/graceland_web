"""protect public submissions

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
"""

from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'public_submission_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=30), nullable=False),
        sa.Column('ip_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_public_submission_attempts_kind', 'public_submission_attempts', ['kind'])
    op.create_index('ix_public_submission_attempts_ip_hash', 'public_submission_attempts', ['ip_hash'])
    op.create_index('ix_public_submission_attempts_created_at', 'public_submission_attempts', ['created_at'])

    with op.batch_alter_table('announcements') as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=False, server_default='approved'))
        batch_op.add_column(sa.Column('reviewed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reviewed_by_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_announcements_reviewed_by_id_users',
            'users',
            ['reviewed_by_id'],
            ['id'],
        )
        batch_op.create_index('ix_announcements_status', ['status'])
    op.alter_column('announcements', 'status', server_default=None)


def downgrade():
    with op.batch_alter_table('announcements') as batch_op:
        batch_op.drop_index('ix_announcements_status')
        batch_op.drop_constraint('fk_announcements_reviewed_by_id_users', type_='foreignkey')
        batch_op.drop_column('reviewed_by_id')
        batch_op.drop_column('reviewed_at')
        batch_op.drop_column('status')
    op.drop_index('ix_public_submission_attempts_created_at', table_name='public_submission_attempts')
    op.drop_index('ix_public_submission_attempts_ip_hash', table_name='public_submission_attempts')
    op.drop_index('ix_public_submission_attempts_kind', table_name='public_submission_attempts')
    op.drop_table('public_submission_attempts')
