from datetime import datetime
from unittest import TestCase, main
from unittest.mock import patch

from flask import Flask

from config import db
import google_calendar_sync as sync
import models


def _item(event_id='google-1', title='Quiet Time'):
    return {
        'id': event_id,
        'status': 'confirmed',
        'summary': title,
        'updated': '2026-08-05T12:00:00Z',
        'start': {'dateTime': '2026-08-06T06:00:00-07:00'},
        'end': {'dateTime': '2026-08-06T06:30:00-07:00'},
    }


class GoogleCalendarSyncTest(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = Flask(__name__)
        cls.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI='sqlite://',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(cls.app)

    def setUp(self):
        self.context = self.app.app_context()
        self.context.push()
        db.metadata.create_all(
            bind=db.engine,
            tables=[
                models.Event.__table__,
                models.EventRegistration.__table__,
                models.GoogleCalendarSyncState.__table__,
            ],
        )

    def tearDown(self):
        db.session.remove()
        db.metadata.drop_all(
            bind=db.engine,
            tables=[
                models.EventRegistration.__table__,
                models.Event.__table__,
                models.GoogleCalendarSyncState.__table__,
            ],
        )
        self.context.pop()

    def test_repeated_sync_updates_without_duplicates(self):
        responses = [([_item()], 'token-1'), ([_item(title='Updated Quiet Time')], 'token-2')]
        with patch.object(sync, 'GOOGLE_CALENDAR_API_KEY', 'test-key'), \
             patch.object(sync, 'GOOGLE_CALENDAR_ID', 'test-calendar'), \
             patch.object(sync, '_fetch_pages', side_effect=responses):
            first = sync.sync_google_calendar(force=True, full=True)
            second = sync.sync_google_calendar(force=True)

        events = models.Event.query.all()
        self.assertEqual(first['created'], 1)
        self.assertEqual(second['updated'], 1)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].title, 'Updated Quiet Time')
        self.assertEqual(events[0].start_datetime, datetime(2026, 8, 6, 6, 0))

    def test_cancelled_google_event_is_deleted(self):
        responses = [([_item()], 'token-1'), ([{'id': 'google-1', 'status': 'cancelled'}], 'token-2')]
        with patch.object(sync, 'GOOGLE_CALENDAR_API_KEY', 'test-key'), \
             patch.object(sync, 'GOOGLE_CALENDAR_ID', 'test-calendar'), \
             patch.object(sync, '_fetch_pages', side_effect=responses):
            sync.sync_google_calendar(force=True, full=True)
            result = sync.sync_google_calendar(force=True)

        self.assertEqual(result['deleted'], 1)
        self.assertEqual(models.Event.query.count(), 0)


if __name__ == '__main__':
    main()
