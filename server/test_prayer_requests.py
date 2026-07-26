import unittest
from datetime import datetime, timedelta, timezone

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text

from app import app
from config import db
from models import PrayerRequest, User
from migrations.versions import (
    a5b6c7d8e9f0_add_prayer_request_name_and_safe_defaults as prayer_migration,
)


class PrayerRequestAPITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app_context = app.app_context()
        cls.app_context.push()
        cls.original_engine = db.engines[None]
        cls.test_engine = create_engine('sqlite://')
        db.engines[None] = cls.test_engine
        db.create_all()
        app.config['TESTING'] = True

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.test_engine.dispose()
        db.engines[None] = cls.original_engine
        cls.app_context.pop()

    def setUp(self):
        db.session.query(PrayerRequest).delete()
        db.session.query(User).delete()
        db.session.commit()
        self.client = app.test_client()

    def create_admin(self):
        admin = User(
            username='prayer_admin',
            email='prayer-admin@example.test',
            is_admin=True,
        )
        admin.set_password('secure-test-password')
        db.session.add(admin)
        db.session.commit()
        with self.client.session_transaction() as session:
            session['user_id'] = admin.id
        return admin

    def test_anonymous_named_private_and_empty_submissions(self):
        anonymous = self.client.post('/prayer-requests', json={
            'name': '   ',
            'request_text': '  Please pray for peace.  ',
            'publication_consent': False,
        })
        self.assertEqual(anonymous.status_code, 201)
        saved = PrayerRequest.query.one()
        self.assertEqual(saved.name, 'Anonymous')
        self.assertEqual(saved.request_text, 'Please pray for peace.')
        self.assertFalse(saved.is_public)
        self.assertEqual(saved.status, 'new')
        self.assertIsNone(saved.user_id)

        named = self.client.post('/prayer-requests', json={
            'name': '  Grace  ',
            'request_text': '  Please pray for my family.  ',
            'publication_consent': True,
        })
        self.assertEqual(named.status_code, 201)
        saved_named = PrayerRequest.query.filter_by(name='Grace').one()
        self.assertTrue(saved_named.is_public)
        self.assertEqual(saved_named.status, 'new')

        empty = self.client.post('/prayer-requests', json={
            'request_text': '   ',
            'publication_consent': False,
        })
        self.assertEqual(empty.status_code, 400)

    def test_admin_authorization_status_changes_and_delete(self):
        request_item = PrayerRequest(
            name='Grace',
            request_text='Please pray for wisdom.',
            is_public=True,
            status='new',
        )
        private_item = PrayerRequest(
            name='Anonymous',
            request_text='A private request.',
            is_public=False,
            status='new',
        )
        db.session.add_all([request_item, private_item])
        db.session.commit()

        unauthenticated = self.client.get('/admin/prayer-requests')
        self.assertEqual(unauthenticated.status_code, 403)

        self.create_admin()
        listing = self.client.get('/admin/prayer-requests')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.get_json()), 2)

        approved = self.client.patch(
            f'/admin/prayer-requests/{request_item.id}',
            json={'status': 'approved_public'},
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(request_item.status, 'approved_public')

        privacy_block = self.client.patch(
            f'/admin/prayer-requests/{private_item.id}',
            json={'status': 'approved_public'},
        )
        self.assertEqual(privacy_block.status_code, 400)

        for status in ['private', 'answered', 'archived', 'new']:
            changed = self.client.patch(
                f'/admin/prayer-requests/{private_item.id}',
                json={'status': status},
            )
            self.assertEqual(changed.status_code, 200)
            self.assertEqual(private_item.status, status)

        deleted = self.client.delete(
            f'/admin/prayer-requests/{request_item.id}'
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertIsNone(db.session.get(PrayerRequest, request_item.id))

    def test_public_wall_visibility_order_limit_and_safe_shape(self):
        now = datetime.now(timezone.utc)
        for index in range(35):
            db.session.add(PrayerRequest(
                name=f'Person {index}',
                request_text=f'Approved request {index}',
                is_public=True,
                status='approved_public',
                date_submitted=now + timedelta(minutes=index),
            ))

        db.session.add_all([
            PrayerRequest(
                name='Private',
                request_text='Never public: no consent',
                is_public=False,
                status='approved_public',
                date_submitted=now + timedelta(days=2),
            ),
            PrayerRequest(
                name='New',
                request_text='Never public: new',
                is_public=True,
                status='new',
                date_submitted=now + timedelta(days=3),
            ),
            PrayerRequest(
                name='Answered',
                request_text='Never public: answered',
                is_public=True,
                status='answered',
                date_submitted=now + timedelta(days=4),
            ),
            PrayerRequest(
                name='Archived',
                request_text='Never public: archived',
                is_public=True,
                status='archived',
                date_submitted=now + timedelta(days=5),
            ),
        ])
        db.session.commit()

        response = self.client.get('/prayer-wall')
        self.assertEqual(response.status_code, 200)
        wall = response.get_json()
        self.assertEqual(len(wall), 30)
        self.assertEqual(wall[0]['number'], 1)
        self.assertEqual(wall[0]['name'], 'Person 34')
        self.assertEqual(wall[-1]['number'], 30)
        self.assertEqual(wall[-1]['name'], 'Person 5')
        self.assertNotIn('id', wall[0])
        self.assertNotIn('user_id', wall[0])
        self.assertNotIn('email', wall[0])
        self.assertNotIn('status', wall[0])
        self.assertNotIn('is_public', wall[0])

    def test_migration_preserves_legacy_rows_with_safe_defaults(self):
        migration_engine = create_engine('sqlite://')
        with migration_engine.begin() as connection:
            connection.execute(text("""
                CREATE TABLE prayer_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    request_text TEXT NOT NULL,
                    is_public BOOLEAN,
                    status VARCHAR(20),
                    date_submitted DATETIME
                )
            """))
            connection.execute(text("""
                INSERT INTO prayer_requests
                    (id, request_text, is_public, status, date_submitted)
                VALUES
                    (1, 'Legacy pending request', NULL, 'pending', '2025-01-01'),
                    (2, 'Legacy answered request', 1, 'answered', '2025-01-02')
            """))

            migration_context = MigrationContext.configure(connection)
            with Operations.context(migration_context):
                prayer_migration.upgrade()

            rows = connection.execute(text("""
                SELECT id, name, request_text, is_public, status
                FROM prayer_requests
                ORDER BY id
            """)).fetchall()

        migration_engine.dispose()
        self.assertEqual(
            rows[0],
            (1, 'Anonymous', 'Legacy pending request', 0, 'new'),
        )
        self.assertEqual(
            rows[1],
            (2, 'Anonymous', 'Legacy answered request', 1, 'answered'),
        )


if __name__ == '__main__':
    unittest.main()
