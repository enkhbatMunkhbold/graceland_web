"""Add recurring church events.

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
"""

from datetime import time

from alembic import op
import sqlalchemy as sa


revision = 'd8e9f0a1b2c3'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    recurring_events = op.create_table(
        'recurring_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('recurrence_type', sa.String(length=20), nullable=False),
        sa.Column('weekdays', sa.String(length=20), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('skip_last_match', sa.Boolean(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    zoom_description = 'Zoom Meeting ID: 9760767777; Password: 2006'
    church_address = '1955 Geary Rd. Walnut Creek, CA 94597'
    op.bulk_insert(recurring_events, [
        {
            'slug': 'quiet-time',
            'title': 'Quiet Time',
            'recurrence_type': 'weekly',
            'weekdays': '1,3,4,5,6',
            'start_time': time(6, 0),
            'end_time': time(6, 30),
            'location': 'Zoom',
            'description': zoom_description,
            'skip_last_match': False,
            'active': True,
        },
        {
            'slug': 'monday-morning-prayer',
            'title': 'Monday Morning Prayer',
            'recurrence_type': 'weekly',
            'weekdays': '0',
            'start_time': time(6, 0),
            'end_time': None,
            'location': 'Zoom',
            'description': zoom_description,
            'skip_last_match': False,
            'active': True,
        },
        {
            'slug': 'wednesday-morning-prayer',
            'title': 'Wednesday Morning Prayer',
            'recurrence_type': 'weekly',
            'weekdays': '2',
            'start_time': time(6, 0),
            'end_time': None,
            'location': 'Zoom',
            'description': zoom_description,
            'skip_last_match': False,
            'active': True,
        },
        {
            'slug': 'sunday-worship',
            'title': 'Sunday Worship',
            'recurrence_type': 'weekly',
            'weekdays': '6',
            'start_time': time(15, 30),
            'end_time': None,
            'location': church_address,
            'description': None,
            'skip_last_match': False,
            'active': True,
        },
        {
            'slug': 'friday-evening-prayer-zoom',
            'title': 'Friday Evening Prayer',
            'recurrence_type': 'weekly',
            'weekdays': '4',
            'start_time': time(21, 30),
            'end_time': None,
            'location': 'Zoom',
            'description': zoom_description,
            'skip_last_match': True,
            'active': True,
        },
        {
            'slug': 'last-friday-evening-prayer-church',
            'title': 'Friday Evening Prayer at Church',
            'recurrence_type': 'last_weekday',
            'weekdays': '4',
            'start_time': time(21, 30),
            'end_time': None,
            'location': church_address,
            'description': None,
            'skip_last_match': False,
            'active': True,
        },
    ])


def downgrade():
    op.drop_table('recurring_events')
