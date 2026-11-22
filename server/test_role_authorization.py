import unittest
from unittest.mock import patch

from sqlalchemy import create_engine

from app import app
from config import db
from models import PasswordResetCode, RoleAuditLog, SignupInvite, StaffRoleRequest, User


class RoleAuthorizationAPITest(unittest.TestCase):
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
        db.session.query(RoleAuditLog).delete()
        db.session.query(StaffRoleRequest).delete()
        db.session.query(PasswordResetCode).delete()
        db.session.query(SignupInvite).delete()
        db.session.query(User).delete()
        db.session.commit()
        self.client = app.test_client()

    def create_user(self, username, *, is_admin=False, is_staff=False):
        user = User(
            username=username,
            email=f'{username.lower()}@example.test',
            is_admin=is_admin,
            is_staff=is_staff,
        )
        user.set_password('secure-test-password')
        db.session.add(user)
        db.session.commit()
        return user

    def login_as(self, user):
        with self.client.session_transaction() as session:
            session['user_id'] = user.id
            session['session_version'] = user.session_version

    def test_admin_can_promote_staff_and_change_is_audited(self):
        staff = self.create_user('staff', is_staff=True)
        admin = self.create_user('admin', is_admin=True)

        self.login_as(admin)
        promoted = self.client.patch(
            f'/admin/users/{staff.id}/roles',
            json={'is_admin': True},
        )
        self.assertEqual(promoted.status_code, 200)
        self.assertTrue(promoted.get_json()['is_admin'])
        audit = RoleAuditLog.query.one()
        self.assertEqual((audit.role, audit.action), ('admin', 'granted'))

        staff_change = self.client.patch(
            f'/admin/users/{staff.id}/roles',
            json={'is_staff': False},
        )
        self.assertEqual(staff_change.status_code, 400)

    def test_boojoo_is_immutable_and_admin_accounts_must_be_demoted_before_deletion(self):
        boojoo = self.create_user('Boojoo')
        admin = self.create_user('admin', is_admin=True)
        member = self.create_user('member')

        self.login_as(admin)
        granted = self.client.patch(
            f'/admin/users/{member.id}/roles',
            json={'is_admin': True},
        )
        self.assertEqual(granted.status_code, 200)
        self.assertTrue(granted.get_json()['is_admin'])

        delete_admin = self.client.delete(f'/users/{member.id}')
        self.assertEqual(delete_admin.status_code, 409)

        denied_demotion = self.client.patch(
            f'/admin/users/{member.id}/roles',
            json={'is_admin': False},
        )
        self.assertEqual(denied_demotion.status_code, 403)

        self.login_as(boojoo)
        demoted = self.client.patch(
            f'/admin/users/{member.id}/roles',
            json={'is_admin': False},
        )
        self.assertEqual(demoted.status_code, 200)
        self.assertFalse(demoted.get_json()['is_admin'])
        self.assertTrue(demoted.get_json()['is_staff'])

        protected_roles = self.client.patch(
            f'/admin/users/{boojoo.id}/roles',
            json={'is_admin': False},
        )
        self.assertEqual(protected_roles.status_code, 403)
        protected_delete = self.client.delete(f'/users/{boojoo.id}')
        self.assertEqual(protected_delete.status_code, 403)

    def test_user_directory_is_not_public(self):
        self.create_user('member')
        response = self.client.get('/users')
        self.assertEqual(response.status_code, 403)

    def test_signup_requires_a_single_use_admin_invitation_and_creates_staff(self):
        no_invite = self.client.post('/sign_up', json={
            'username': 'uninvited',
            'email': 'uninvited@example.test',
            'password': 'secure-test-password',
        })
        self.assertEqual(no_invite.status_code, 400)

        ordinary_admin = self.create_user('admin', is_admin=True)
        self.login_as(ordinary_admin)
        created = self.client.post('/admin/signup-invites', json={'expires_in_days': 7})
        self.assertEqual(created.status_code, 201)
        token = created.get_json()['token']

        signup = self.client.post('/sign_up', json={
            'username': 'invited',
            'email': 'invited@example.test',
            'password': 'secure-test-password',
            'invite_token': token,
        })
        self.assertEqual(signup.status_code, 201)
        invited = User.query.filter_by(username='invited').one()
        self.assertFalse(invited.is_admin)
        self.assertTrue(invited.is_staff)

        reused = self.client.post('/sign_up', json={
            'username': 'second',
            'email': 'second@example.test',
            'password': 'secure-test-password',
            'invite_token': token,
        })
        self.assertEqual(reused.status_code, 403)

        self.login_as(ordinary_admin)
        deleted = self.client.delete(f'/users/{invited.id}')
        self.assertEqual(deleted.status_code, 200)
        self.assertIsNone(db.session.get(User, invited.id))

    @patch('app.send_password_reset_code')
    def test_boojoo_can_reset_password_with_emailed_code(self, send_code):
        boojoo = self.create_user('Boojoo')
        boojoo.phone = '+19259485074'
        db.session.commit()

        login = self.client.post('/login', json={
            'username': 'Boojoo',
            'password': 'secure-test-password',
        })
        self.assertEqual(login.status_code, 200)

        requested = self.client.post('/password-reset/request', json={'username': 'Boojoo'})
        self.assertEqual(requested.status_code, 200)
        self.assertEqual(send_code.call_count, 1)
        emailed_code = send_code.call_args.args[1]
        self.assertRegex(emailed_code, r'^\d{6}$')

        reset = self.client.post('/password-reset/confirm', json={
            'username': 'Boojoo',
            'code': emailed_code,
            'new_password': 'new-secure-password',
        })
        self.assertEqual(reset.status_code, 200)
        db.session.refresh(boojoo)
        self.assertTrue(boojoo.authenticate('new-secure-password'))
        self.assertEqual(boojoo.phone, '+19259485074')
        self.assertEqual(self.client.get('/check_session').status_code, 401)

        reused = self.client.post('/password-reset/confirm', json={
            'username': 'Boojoo',
            'code': emailed_code,
            'new_password': 'another-secure-password',
        })
        self.assertEqual(reused.status_code, 400)


if __name__ == '__main__':
    unittest.main()
