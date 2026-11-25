import unittest

from sqlalchemy import create_engine

from app import app
from config import db
from models import Announcement, PrayerRequest, PublicSubmissionAttempt, User


class PublicSubmissionProtectionTest(unittest.TestCase):
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
        db.session.query(PublicSubmissionAttempt).delete()
        db.session.query(Announcement).delete()
        db.session.query(PrayerRequest).delete()
        db.session.query(User).delete()
        db.session.commit()
        app.config['PUBLIC_SUBMISSION_LIMIT'] = 5
        self.client = app.test_client()

    def login_staff(self):
        staff = User(username='reviewer', email='reviewer@example.test', is_staff=True)
        staff.set_password('secure-test-password')
        db.session.add(staff)
        db.session.commit()
        with self.client.session_transaction() as session:
            session['user_id'] = staff.id
            session['session_version'] = staff.session_version
        return staff

    def test_announcement_requires_staff_approval(self):
        created = self.client.post('/announcements', json={
            'name': 'Visitor',
            'content': 'Community announcement',
            'website': '',
        })
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.get_json()['status'], 'pending')
        self.assertEqual(self.client.get('/announcements').get_json(), [])

        self.login_staff()
        listing = self.client.get('/admin/announcements')
        self.assertEqual(listing.status_code, 200)
        announcement_id = listing.get_json()[0]['id']
        approved = self.client.patch(
            f'/admin/announcements/{announcement_id}',
            json={'status': 'approved'},
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(len(self.client.get('/announcements').get_json()), 1)

    def test_rate_limit_is_enforced_per_form_and_ip(self):
        app.config['PUBLIC_SUBMISSION_LIMIT'] = 2
        payload = {'request_text': 'Please pray.', 'publication_consent': True}
        self.assertEqual(self.client.post('/prayer-requests', json=payload).status_code, 201)
        self.assertEqual(self.client.post('/prayer-requests', json=payload).status_code, 201)
        self.assertEqual(self.client.post('/prayer-requests', json=payload).status_code, 429)

    def test_honeypot_rejects_bots_without_saving_content(self):
        response = self.client.post('/announcements', json={
            'content': 'Spam',
            'website': 'https://spam.example',
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Announcement.query.count(), 0)


if __name__ == '__main__':
    unittest.main()
