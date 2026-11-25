from config import (
    app,
    db,
    api,
    FACEBOOK_PAGE_ID,
    FACEBOOK_PAGE_ACCESS_TOKEN,
    YOUTUBE_API_KEY,
    YOUTUBE_CHANNEL_ID,
    GOOGLE_CALENDAR_API_KEY,
    GOOGLE_CALENDAR_ID,
    TURNSTILE_SECRET_KEY,
)
from flask import session, request, send_file, send_from_directory
from flask_restful import Resource
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from marshmallow.exceptions import ValidationError
from datetime import datetime, date, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
import json
import os
import uuid
import hashlib
import hmac
import secrets
from io import BytesIO
import models  # Import models to register them with SQLAlchemy
import schemas
from auth_utils import user_is_admin, user_is_staff, user_is_protected_superuser
from ministry_upload import ministry_upload_allowed, save_ministry_upload
from google_calendar_sync import start_hourly_sync, sync_google_calendar
from email_delivery import send_password_reset_code

# Initialize Flask-Migrate
migrate = Migrate(app, db)

@app.route('/')
def index():
    return '<h1>Church Management System</h1>'


def _get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    user = db.session.get(models.User, user_id)
    if not user or session.get('session_version') != user.session_version:
        session.clear()
        return None
    return user


def _require_admin():
    user = _get_current_user()
    if not user or not user_is_admin(user):
        return None
    return user

def _require_admin_or_staff():
    user = _get_current_user()
    if not user or not (user_is_admin(user) or user_is_staff(user)):
        return None
    return user

HOME_ANNOUNCEMENT_KEY = 'home_announcement'
HOME_ANNOUNCEMENT_DEFAULT = {
    'enabled': False,
    'type': 'image',
    'title': '',
    'body': '',
    'mediaUrl': '',
    'posterUrl': '',
    'alt': '',
}


def _visitor_ip_hash():
    # Cloudflare sets this header itself; otherwise use the direct peer address.
    address = request.headers.get('CF-Connecting-IP') or request.remote_addr or 'unknown'
    return hmac.new(
        app.secret_key.encode('utf-8'),
        address.strip().encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def _verify_public_submission(data, kind):
    if str(data.get('website', '') or '').strip():
        return {'error': 'Unable to submit this form'}, 400

    if TURNSTILE_SECRET_KEY:
        token = str(data.get('turnstile_token', '') or '').strip()
        if not token:
            return {'error': 'Please complete the security check'}, 400
        verification_data = urlencode({
            'secret': TURNSTILE_SECRET_KEY,
            'response': token,
            'remoteip': request.headers.get('CF-Connecting-IP') or request.remote_addr or '',
        }).encode('utf-8')
        try:
            verification_request = Request(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                data=verification_data,
                method='POST',
            )
            with urlopen(verification_request, timeout=5) as response:
                verified = json.loads(response.read().decode('utf-8')).get('success', False)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            return {'error': 'The security check is temporarily unavailable'}, 503
        if not verified:
            return {'error': 'The security check was unsuccessful. Please try again'}, 400

    cutoff = datetime.utcnow() - timedelta(
        seconds=app.config['PUBLIC_SUBMISSION_WINDOW_SECONDS']
    )
    ip_hash = _visitor_ip_hash()
    recent_count = models.PublicSubmissionAttempt.query.filter(
        models.PublicSubmissionAttempt.kind == kind,
        models.PublicSubmissionAttempt.ip_hash == ip_hash,
        models.PublicSubmissionAttempt.created_at >= cutoff,
    ).count()
    if recent_count >= app.config['PUBLIC_SUBMISSION_LIMIT']:
        return {'error': 'Too many submissions. Please try again later'}, 429
    db.session.add(models.PublicSubmissionAttempt(kind=kind, ip_hash=ip_hash))
    return None


def _home_announcement_value():
    setting = models.SiteSetting.query.filter_by(key=HOME_ANNOUNCEMENT_KEY).first()
    if not setting or not setting.value:
        return HOME_ANNOUNCEMENT_DEFAULT.copy()
    try:
        saved = json.loads(setting.value)
    except (TypeError, json.JSONDecodeError):
        return HOME_ANNOUNCEMENT_DEFAULT.copy()
    if (
        saved.get('title') == 'Welcome to Graceland'
        and saved.get('body') == 'Watch this space for church news, special services, and upcoming events.'
    ):
        saved = {**saved, 'title': '', 'body': ''}
    try:
        return _validate_home_announcement({**HOME_ANNOUNCEMENT_DEFAULT, **saved})
    except ValueError:
        return HOME_ANNOUNCEMENT_DEFAULT.copy()


def _validate_home_announcement(data):
    if not isinstance(data, dict):
        raise ValueError('Announcement data is required')
    announcement_type = str(data.get('type', 'image')).strip().lower()
    if announcement_type not in ('image', 'video'):
        raise ValueError('Official announcements must be an image or video')

    def text_value(key, limit):
        return str(data.get(key, '') or '').strip()[:limit]

    result = {
        'enabled': bool(data.get('enabled', True)),
        'type': announcement_type,
        'title': '',
        'body': '',
        'mediaUrl': text_value('mediaUrl', 2000),
        'posterUrl': text_value('posterUrl', 2000),
        'alt': text_value('alt', 500),
    }
    if result['enabled'] and not result['mediaUrl']:
        raise ValueError(f'{announcement_type.capitalize()} announcements require a media file or URL')
    return result

class CheckSession(Resource):
    def get(self):
        user = _get_current_user()
        if not user:
            return {'error': 'Not authenticated'}, 401

        if not user.is_staff:
            user.is_staff = True
            db.session.commit()

        user_data = schemas.user_schema.dump(user)
        return user_data, 200
    
api.add_resource(CheckSession, '/check_session')

class Login(Resource):
    def post(self):
        try:
          data = request.get_json()
          if not data or not all(c in data for c in ['username', 'password']):
              return {'error': 'MIssing required fields'}, 400
          
          user = models.User.query.filter_by(username=data['username']).first()
          if not user or not user._password_hash:
              return {'message': 'Invalid credentials'}, 401
          
          if user.authenticate(data['password']):
              if not user.is_staff:
                  user.is_staff = True
                  db.session.commit()
              session['user_id'] = user.id
              session['session_version'] = user.session_version
              session.permanent = True
              return schemas.user_schema.dump(user), 200
          return {'message': 'Invalid credentials'}, 401    

        except Exception as e:
            return {'error': str(e)}, 500
        
api.add_resource(Login, '/login')

class Logout(Resource):
    def delete(self):
        # Logout is intentionally idempotent so a stale mobile/PWA client can
        # always clear its local authenticated state.
        session.clear()
        return {'message': 'Logout successful'}, 200

api.add_resource(Logout, '/logout')


def _reset_code_hash(user_id, code):
    value = '{}:{}'.format(user_id, code).encode('utf-8')
    return hmac.new(app.secret_key.encode('utf-8'), value, hashlib.sha256).hexdigest()


class PasswordResetRequest(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        username = str(data.get('username', '') or '').strip()
        generic = {'message': 'If the protected account exists, a recovery code has been sent.'}
        user = models.User.query.filter_by(username=username).first()
        if not user_is_protected_superuser(user):
            return generic, 200

        now = datetime.utcnow()
        recent_count = models.PasswordResetCode.query.filter(
            models.PasswordResetCode.user_id == user.id,
            models.PasswordResetCode.requested_at >= now - timedelta(minutes=15),
        ).count()
        if recent_count >= 3:
            return generic, 200

        code = '{:06d}'.format(secrets.randbelow(1000000))
        reset = models.PasswordResetCode(
            user_id=user.id,
            code_hash=_reset_code_hash(user.id, code),
            expires_at=now + timedelta(minutes=10),
        )
        models.PasswordResetCode.query.filter_by(user_id=user.id, used_at=None).update(
            {'used_at': now}, synchronize_session=False
        )
        db.session.add(reset)
        try:
            send_password_reset_code(user.email, code)
            db.session.commit()
        except Exception:
            db.session.rollback()
            app.logger.exception('Password recovery email delivery failed')
            return {'error': 'Password recovery email is temporarily unavailable'}, 503
        return generic, 200


class PasswordResetConfirm(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        username = str(data.get('username', '') or '').strip()
        code = str(data.get('code', '') or '').strip()
        password = str(data.get('new_password', '') or '')
        if len(code) != 6 or not code.isdigit() or not 8 <= len(password) <= 128:
            return {'error': 'Invalid or expired recovery code'}, 400

        user = models.User.query.filter_by(username=username).first()
        if not user_is_protected_superuser(user):
            return {'error': 'Invalid or expired recovery code'}, 400
        reset = models.PasswordResetCode.query.filter_by(user_id=user.id, used_at=None).order_by(
            models.PasswordResetCode.requested_at.desc()
        ).first()
        now = datetime.utcnow()
        if not reset or reset.expires_at <= now or reset.attempts >= 5:
            return {'error': 'Invalid or expired recovery code'}, 400

        reset.attempts += 1
        if not hmac.compare_digest(reset.code_hash, _reset_code_hash(user.id, code)):
            db.session.commit()
            return {'error': 'Invalid or expired recovery code'}, 400

        user.set_password(password)
        user.session_version += 1
        reset.used_at = now
        db.session.commit()
        session.clear()
        return {'message': 'Password updated successfully'}, 200


api.add_resource(PasswordResetRequest, '/password-reset/request')
api.add_resource(PasswordResetConfirm, '/password-reset/confirm')

class SignUp(Resource):
    def post(self):
        try:
            data = request.get_json()

            if not data or not all(c in data for c in ['username', 'email', 'password', 'invite_token']):
                return {'error': 'Missing required fields'}, 400

            username = str(data.get('username', '') or '').strip()
            password = str(data.get('password', '') or '')
            if not 3 <= len(username) <= 50:
                return {'error': 'Username must be between 3 and 50 characters'}, 400
            if any(not (char.isascii() and (char.isalnum() or char in '._-')) for char in username):
                return {'error': 'Username may contain only letters, numbers, periods, underscores, and hyphens'}, 400
            if not 10 <= len(password) <= 100:
                return {'error': 'Password must be between 10 and 100 characters'}, 400
            if not any(char.isupper() for char in password):
                return {'error': 'Password must contain at least one uppercase letter'}, 400
            if not any(char.islower() for char in password):
                return {'error': 'Password must contain at least one lowercase letter'}, 400
            if not any(char.isdigit() for char in password):
                return {'error': 'Password must contain at least one number'}, 400
            if not any(not char.isalnum() and not char.isspace() for char in password):
                return {'error': 'Password must contain at least one special character'}, 400

            data['username'] = username

            invite_token = str(data.get('invite_token', '') or '').strip()
            invite_hash = hashlib.sha256(invite_token.encode('utf-8')).hexdigest()
            invite = models.SignupInvite.query.filter_by(token_hash=invite_hash).first()
            if not invite or invite.used_at or invite.expires_at <= datetime.utcnow():
                return {'error': 'This signup invitation is invalid or expired'}, 403
            
            if models.User.query.filter_by(username=data['username']).first():
                return {'error': 'Username already exists'}, 400
            
            if models.User.query.filter_by(email=data['email']).first():
                return {'error': 'Email already exists'}, 400
            
            new_user = models.User(username=data['username'], email=data['email'], is_staff=True)
            new_user.set_password(password)

            db.session.add(new_user)
            db.session.flush()
            invite.used_at = datetime.utcnow()
            invite.used_by_id = new_user.id
            db.session.commit()

            session['user_id'] = new_user.id
            session['session_version'] = new_user.session_version
            return schemas.user_schema.dump(new_user), 201
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': str(ve)}, 400
        
        except Exception as e:
            db.session.rollback()
            return {'error': f"An error occured during registration: {str(e)}"}, 500          
        
api.add_resource(SignUp, '/sign_up')


class SignupInvites(Resource):
    def post(self):
        actor = _require_admin()
        if not actor:
            return {'error': 'Administrator access required'}, 403
        data = request.get_json(silent=True) or {}
        expires_in_days = data.get('expires_in_days', 7)
        if not isinstance(expires_in_days, int) or not 1 <= expires_in_days <= 30:
            return {'error': 'Invitation expiry must be between 1 and 30 days'}, 400
        token = secrets.token_urlsafe(32)
        invite = models.SignupInvite(
            token_hash=hashlib.sha256(token.encode('utf-8')).hexdigest(),
            created_by_id=actor.id,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days),
        )
        db.session.add(invite)
        db.session.commit()
        return {
            'token': token,
            'expires_at': invite.expires_at.isoformat(),
        }, 201


api.add_resource(SignupInvites, '/admin/signup-invites')

class Users(Resource):
    def get(self):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        users = models.User.query.all()
        return schemas.users_schema.dump(users), 200
    
    def post(self):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        try:
            data = request.get_json()

            new_user = models.User(username=data['username'], email=data['email'], is_staff=True)
            new_user.set_password(data['password'])

            db.session.add(new_user)
            db.session.commit()
            return schemas.user_schema.dump(new_user), 201
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {'error': 'User already exists'}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(Users, '/users')

class UserByID(Resource):
    def get(self, user_id):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        user = db.session.get(models.User, user_id)
        if not user:
            return {'error': 'User not found'}, 404
        return schemas.user_schema.dump(user), 200
    
    def patch(self, user_id):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        user = db.session.get(models.User, user_id)
        if not user:
            return {'error': 'User not found'}, 404
        
        try: 
            data = request.get_json()
            if not data:
                return {'error': 'No data provided'}, 400
            if user_is_protected_superuser(user):
                requested_username = data.get('username', user.username)
                if requested_username != user.username:
                    return {'error': 'The protected administrator username cannot be changed'}, 403
                if data.get('is_admin') is False or data.get('is_staff') is False:
                    return {'error': 'Boojoo must remain both administrator and staff'}, 403
            updated_user = schemas.user_schema.load(data, instance=user, partial=True)
            db.session.commit()

            return schemas.user_schema.dump(updated_user), 200
        
        except ValidationError as ve:
            return {'error': ve.messages}, 400
        
        except Exception as e:
            db.session.rollback()
            return {'error': f'Internal server error: {str(e)}'}, 500
        
    def delete(self, user_id):
        actor = _require_admin()
        if not actor:
            return {'error': 'Administrator access required'}, 403
        user = db.session.get(models.User, user_id)

        if not user:
            return {'error': 'User not found'}, 404
        if user_is_protected_superuser(user):
            return {'error': 'The protected Boojoo account cannot be deleted'}, 403
        if user.id == actor.id:
            return {'error': 'You cannot delete your own account'}, 403
        try:
            for table in db.metadata.sorted_tables:
                if table.name == models.User.__tablename__:
                    continue
                user_columns = [
                    column for column in table.columns
                    if any(
                        foreign_key.column.table.name == models.User.__tablename__
                        for foreign_key in column.foreign_keys
                    )
                ]
                for column in user_columns:
                    statement = (
                        table.update().where(column == user.id).values({column.name: None})
                        if column.nullable
                        else table.delete().where(column == user.id)
                    )
                    db.session.execute(statement)
            db.session.delete(user)
            db.session.commit()
            return {'message': 'User deleted successfully'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500       

api.add_resource(UserByID, '/users/<int:user_id>')


ROLE_REQUEST_STATUSES = {'pending', 'approved', 'rejected'}


def _role_user_data(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user_is_admin(user),
        'is_staff': user_is_staff(user),
        'is_protected': user_is_protected_superuser(user),
    }


def _staff_request_data(role_request):
    return {
        'id': role_request.id,
        'status': role_request.status,
        'requested_at': role_request.requested_at.isoformat() if role_request.requested_at else None,
        'reviewed_at': role_request.reviewed_at.isoformat() if role_request.reviewed_at else None,
        'user': _role_user_data(role_request.user),
        'reviewed_by': role_request.reviewed_by.username if role_request.reviewed_by else None,
    }


def _record_role_change(actor, target, role, action):
    db.session.add(models.RoleAuditLog(
        actor_id=actor.id,
        target_user_id=target.id,
        role=role,
        action=action,
    ))


class MyStaffRoleRequest(Resource):
    def get(self):
        user = _get_current_user()
        if not user:
            return {'error': 'Login required'}, 401
        latest = (
            models.StaffRoleRequest.query
            .filter_by(user_id=user.id)
            .order_by(models.StaffRoleRequest.requested_at.desc())
            .first()
        )
        return {'request': _staff_request_data(latest) if latest else None}, 200

    def post(self):
        user = _get_current_user()
        if not user:
            return {'error': 'Login required'}, 401
        if user_is_staff(user):
            return {'error': 'This account already has staff access'}, 400
        pending = models.StaffRoleRequest.query.filter_by(
            user_id=user.id,
            status='pending',
        ).first()
        if pending:
            return _staff_request_data(pending), 200
        role_request = models.StaffRoleRequest(user_id=user.id, status='pending')
        db.session.add(role_request)
        db.session.commit()
        return _staff_request_data(role_request), 201


class AdminStaffRoleRequests(Resource):
    def get(self):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        status = request.args.get('status', 'pending').strip().lower()
        if status not in ROLE_REQUEST_STATUSES and status != 'all':
            return {'error': 'Invalid request status'}, 400
        query = models.StaffRoleRequest.query
        if status != 'all':
            query = query.filter_by(status=status)
        role_requests = query.order_by(models.StaffRoleRequest.requested_at.desc()).all()
        return [_staff_request_data(item) for item in role_requests], 200


class AdminStaffRoleRequestByID(Resource):
    def patch(self, role_request_id):
        actor = _require_admin()
        if not actor:
            return {'error': 'Administrator access required'}, 403
        role_request = db.session.get(models.StaffRoleRequest, role_request_id)
        if not role_request:
            return {'error': 'Staff request not found'}, 404
        if role_request.status != 'pending':
            return {'error': 'This staff request has already been reviewed'}, 409
        decision = str((request.get_json(silent=True) or {}).get('decision', '')).strip().lower()
        if decision not in {'approved', 'rejected'}:
            return {'error': 'Decision must be approved or rejected'}, 400
        role_request.status = decision
        role_request.reviewed_by_id = actor.id
        role_request.reviewed_at = datetime.now(timezone.utc)
        if decision == 'approved' and not user_is_staff(role_request.user):
            role_request.user.is_staff = True
            _record_role_change(actor, role_request.user, 'staff', 'granted')
        db.session.commit()
        return _staff_request_data(role_request), 200


class AdminRoleUsers(Resource):
    def get(self):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        users = models.User.query.order_by(models.User.username.asc()).all()
        return [_role_user_data(user) for user in users], 200


class AdminUserRoles(Resource):
    def patch(self, user_id):
        actor = _require_admin()
        if not actor:
            return {'error': 'Administrator access required'}, 403
        target = db.session.get(models.User, user_id)
        if not target:
            return {'error': 'User not found'}, 404
        data = request.get_json(silent=True) or {}
        allowed = {'is_admin'}
        if not data or any(key not in allowed for key in data):
            return {'error': 'Only is_admin may be changed'}, 400
        if user_is_protected_superuser(target):
            return {'error': 'Boojoo roles are permanent'}, 403

        if 'is_admin' in data:
            if not isinstance(data['is_admin'], bool):
                return {'error': 'is_admin must be true or false'}, 400
            if target.is_admin != data['is_admin']:
                target.is_admin = data['is_admin']
                target.is_staff = True
                _record_role_change(actor, target, 'admin', 'granted' if target.is_admin else 'revoked')

        db.session.commit()
        return _role_user_data(target), 200


class AdminRoleAudit(Resource):
    def get(self):
        if not _require_admin():
            return {'error': 'Administrator access required'}, 403
        entries = models.RoleAuditLog.query.order_by(models.RoleAuditLog.created_at.desc()).limit(100).all()
        return [{
            'id': entry.id,
            'actor': entry.actor.username,
            'target': entry.target_user.username,
            'role': entry.role,
            'action': entry.action,
            'created_at': entry.created_at.isoformat() if entry.created_at else None,
        } for entry in entries], 200


api.add_resource(MyStaffRoleRequest, '/role-requests/staff')
api.add_resource(AdminStaffRoleRequests, '/admin/role-requests')
api.add_resource(AdminStaffRoleRequestByID, '/admin/role-requests/<int:role_request_id>')
api.add_resource(AdminRoleUsers, '/admin/users')
api.add_resource(AdminUserRoles, '/admin/users/<int:user_id>/roles')
api.add_resource(AdminRoleAudit, '/admin/role-audit')

class Members(Resource):
    def get(self):
        members = models.Member.query.all()
        return schemas.members_schema.dump(members), 200
    
    def post(self):
        try:
            data = request.get_json()
            new_member = schemas.member_schema.load(data)
            db.session.add(new_member)
            db.session.commit()
            return schemas.member_schema.dump(new_member), 201
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(Members, '/members')

class MemberByID(Resource):
    def get(self, member_id):
        member = db.session.get(models.Member, member_id)
        if not member:
            return {'error': 'Member not found'}, 404
        return schemas.member_schema.dump(member), 200
    
    def patch(self, member_id):
        member = db.session.get(models.Member, member_id)
        if not member:
            return {'error': 'Member not found'}, 404        
        try:
            data = request.get_json()
            if not data:
                return {'error': 'No data provided'}, 400
            for key, value in data.items():
                if hasattr(member, key):
                    setattr(member, key, value)
            db.session.commit()
            return schemas.member_schema.dump(member), 200
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400        
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
    def delete(self, member_id):
        member = db.session.get(models.Member, member_id)
        if not member:
            return {'error': 'Member not found'}, 404
        
        try:
            db.session.delete(member)
            db.session.commit()
            return {'message': 'Member deleted successfully'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(MemberByID, '/members/<int:member_id>')

class Ministries(Resource):
    def get(self):
        ministries = models.Ministry.query.all()
        return schemas.ministries_schema.dump(ministries), 200
    
    def post(self):
        try:
            data = request.get_json()
            new_ministry = schemas.ministries_schema.load(data)
            db.session.add(new_ministry)
            db.commit()
            return schemas.ministry_schema.dump(new_ministry), 201
        
        except ValidationError as ve:
            db.session.rollback()
            return{'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

api.add_resource(Ministries, '/ministries')

class MinistryByID(Resource):
    def get(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404        
        return schemas.ministry_schema.dump(ministry), 200
    
    def patch(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404        
        try:
            data = request.get_json()
            if not data:
                return {'error': 'No data provided'}, 404
            for key, value in data.items():
                if hasattr(ministry, key) and key not in ['id', 'created_at']:
                    setattr(ministry, key, value)
                db.session.commit()
                return schemas.ministry_schema.dump(ministry), 200
        except ValidationError as ve:
            return {'error': ve.messages}, 400
        except Exception as e:
            return {'error': str(e)}, 500
        
    def delete(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404
        try:
            db.session.delete(ministry)
            db.session.commit()
            return {'message': 'Ministry deleted successfully'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

api.add_resource(MinistryByID, '/ministries/<int:id>')

class MinistryLeaders(Resource):
    def get(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404
        
        # Optional: filter by active status
        is_active = request.args.get('is_active')
        query = models.MinistryLeader.query.filter_by(ministry_id=ministry_id)
        if is_active is not None:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        leaders = query.all()
        return schemas.ministry_leaders_schema.dump(leaders), 200
    
    def post(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404
        
        try:
            data = request.get_json()
            data['ministry_id'] = ministry_id
            user = db.session.get(models.User, data.get('user_id'))
            if not user:
                return {'error': 'User not found'}, 404            
            new_leader = schemas.ministry_leader_schema.load(data)
            db.session.add(new_leader)
            db.session.commit()
            return schemas.ministry_leader_schema.dump(new_leader), 201
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

api.add_resource(MinistryLeaders, '/ministries/<int:ministry_id>/leaders')

class MinistryLeaderByID(Resource):
    def get(self, ministry_id, leader_id):
        ministry_leader = db.session.get(models.MinistryLeader, leader_id)
        if not ministry_leader or ministry_leader.ministry_id != ministry_id:
            return {'error': 'Ministry leader not found'}, 404
        return schemas.ministry_leader_schema.dump(ministry_leader), 200
    
    def patch(self, ministry_id, leader_id):
        ministry_leader = db.session.get(models.MinistryLeader, leader_id)
        if not ministry_leader or ministry_leader.ministry_id != ministry_id:
            return {'error': 'Ministry leader not found'}, 404
        
        try:
            data = request.get()
            for key, value in data.items():
                if hasattr(ministry_leader, key) and key not in ['id', 'ministry_id', 'created_id']:
                    setattr(ministry_leader, key, value)
            db.session.commit()
            return schemas.ministry_leader_schema.dump(ministry_leader), 200
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

    def delete(self, ministry_id, leader_id):
        ministry_leader = db.session.get(models.MinistryLeader, leader_id)        
        try:
            if not ministry_leader or ministry_leader.ministry_id != ministry_id:
              return {'error': 'Ministry leader not found'}, 404
            
            db.session.delete(ministry_leader)
            db.session.commit()
            return {'message': 'Ministry leader successfully deleted'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

api.add_resource(MinistryLeaderByID, '/ministry/<int:ministry_id>/leaders>/<int:leader_id>')          
                    
class MinistryMembers(Resource):
    def get(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404

        is_active = request.args.get(request['is_active'])    
        query = models.MinistryMember.filter_by(ministry_id=ministry_id)

        if is_active is not None:
            query = query.filter_by(is_active=is_active.lower() == True)

        members = query.all()
        return schemas.ministry_members_schema.dump(members), 200

    def post(self, ministry_id):
        ministry = db.session.get(models.Ministry, ministry_id)
        if not ministry:
            return {'error': 'Ministry not found'}, 404

        try:
            data = request.get_json()
            data['ministry_id'] = ministry_id

            user = db.session.get(models.User, data.get('user_id'))
            if not user:
                return {'error': 'User not found'}, 404

            new_member = schemas.ministry_member_schema.load(data)
            db.session.add(new_member)
            db.session.commit()
            return schemas.ministry_member_schema.dump(new_member)

        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Member is already a member of this ministry'}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

api.add_resource(MinistryMembers, '/ministries/<int:ministry_id>/members')   

class Groups(Resource):
    def get(self):
        groups = models.Group.query.all()
        return schemas.groups_schema.dump(groups), 200
    
    def post(self):
        try:
          data = request.get_json()
          new_group = schemas.group_schema.load(data)
          db.session.add(new_group)
          db.session.commit()
          return schemas.group_schema.dump(new_group), 200
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(Groups, '/groups')

class GroupByID(Resource):
    def get(self, group_id):
        group = db.session.get(models.Group, group_id)
        if not group:
            return {'error': 'Group not found'}, 404
        return schemas.group_schema.dump(group), 200
    
    def patch(self, group_id):
        group = db.session.get(models.Group, group_id)
        if not group:
            return {'error': 'Group not found'}, 404
        try:
            data = request.get_json()
            for key, value in data.items():
                if hasattr(group, key):
                    setattr(group, key, value)
            db.session.commit()
            return schemas.group_schema.dump(group), 200
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
    def delete(self, group_id):
        group = db.session.get(models.Group, group_id)
        if not group:
            return {'error': 'Group not found'}, 404
        try:
          db.session.delete(group)
          db.session.commit()
          return schemas.group_schema.dump(group), 200
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(GroupByID, '/groups/<int:group_id>')
            
class GroupMembers(Resource):
    def get(self, group_id):
        group = db.session.get(models.Group, group_id)  
        if not group:
            return {'error': 'Group not found'}, 404
        members = models.GroupMember.query.filter_by(group_id=group_id).all()
        return schemas.group_members_schema.dump(members), 200
    
    def post(self, group_id):
        group = db.session.get(models.Group, group_id)
        if not group:
            return {'error': 'Group not found'}, 404
        
        try:
            data = request.get_json()
            data['group_id'] = group_id
            new_member = schemas.group_member_schema.load(data)
            db.session.add(new_member)
            db.session.commit()
            return schemas.group_member_schema.dump(new_member), 201
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 400
        
api.add_resource(GroupMembers, '/groups/<int:group_id>/members')

class Events(Resource):
    def get(self):
        try:
            sync_google_calendar()
        except Exception as error:
            app.logger.warning('Unable to refresh Google Calendar events: %s', error)
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        query = models.Event.query

        if month and year:
            month_start = datetime(year, month, 1)
            if month == 12:
                month_end = datetime(year + 1, 1, 1)
            else:
                month_end = datetime(year, month + 1, 1)
            query = query.filter(
                models.Event.start_datetime >= month_start,
                models.Event.start_datetime < month_end,
            )

        events = query.order_by(models.Event.start_datetime.asc()).all()
        return schemas.events_schema.dump(events), 200
            
    def post(self):
        if not _require_admin_or_staff():
            return {'error': 'Admin or staff access required'}, 403

        try:
            data = request.get_json()
            new_event = schemas.event_schema.load(data)
            db.session.add(new_event)
            db.session.commit()
            return schemas.event_schema.dump(new_event), 201
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(Events, '/events')

class EventByID(Resource):
    def get(self, event_id):
        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        return schemas.event_schema.dump(event)
    
    def patch(self, event_id):
        if not _require_admin_or_staff():
            return {'error': 'Admin or staff access required'}, 403

        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        if event.is_read_only:
            return {'error': 'Synchronized calendar events are read-only'}, 403
        
        try:
            data = request.get_json()
            if not data:
                return {'error': 'Data not provided'}, 400
            for key, value in data.items():
                if hasattr(event, key):
                    setattr(event, key, value)

            db.session.commit()
            return schemas.event_schema.dump(event), 200
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
    def delete(self, event_id):
        if not _require_admin_or_staff():
            return {'error': 'Admin or staff access required'}, 403

        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        if event.is_read_only:
            return {'error': 'Synchronized calendar events are read-only'}, 403
        try:
          db.session.delete(event)
          db.session.commit()
          return {'message': 'Event successfully deleted'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(EventByID, '/events/<int:event_id>')

class DailyJobs(Resource):
    def get(self):
        date_value = request.args.get('date', '').strip()
        query = models.DailyJob.query
        if date_value:
            try:
                query = query.filter_by(job_date=date.fromisoformat(date_value))
            except ValueError:
                return {'error': 'Date must use YYYY-MM-DD format'}, 400
        jobs = query.order_by(
            models.DailyJob.job_date.asc(),
            models.DailyJob.start_time.asc(),
        ).all()
        return schemas.daily_jobs_schema.dump(jobs), 200

    def post(self):
        user = _require_admin_or_staff()
        if not user:
            return {'error': 'Admin or staff access required'}, 403
        try:
            job = schemas.daily_job_schema.load(request.get_json() or {})
            job.created_by_id = user.id
            db.session.add(job)
            db.session.commit()
            return schemas.daily_job_schema.dump(job), 201
        except ValidationError as error:
            db.session.rollback()
            return {'error': error.messages}, 400


class DailyJobByID(Resource):
    def patch(self, job_id):
        user = _require_admin_or_staff()
        if not user:
            return {'error': 'Admin or staff access required'}, 403
        job = db.session.get(models.DailyJob, job_id)
        if not job:
            return {'error': 'Daily job not found'}, 404
        try:
            updated = schemas.daily_job_schema.load(
                request.get_json() or {},
                instance=job,
                partial=True,
            )
            db.session.add(updated)
            db.session.commit()
            return schemas.daily_job_schema.dump(updated), 200
        except ValidationError as error:
            db.session.rollback()
            return {'error': error.messages}, 400

    def delete(self, job_id):
        if not _require_admin_or_staff():
            return {'error': 'Admin or staff access required'}, 403
        job = db.session.get(models.DailyJob, job_id)
        if not job:
            return {'error': 'Daily job not found'}, 404
        db.session.delete(job)
        db.session.commit()
        return {'message': 'Daily job deleted'}, 200


api.add_resource(DailyJobs, '/daily-jobs')
api.add_resource(DailyJobByID, '/daily-jobs/<int:job_id>')

class EventRegistrations(Resource):
    def get(self, event_id):
        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        
        registrations = models.EventRegistration.query.filter_by(event_id=event_id).all()
        return schemas.event_registrations_schema.dump(registrations), 200
    
    def post(self, event_id):
        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        
        try:
            data = request.get_json()
            if not data:
                return {'error': 'Data not provided'}, 404
            new_registration = schemas.event_registration_schema.load(data)
            db.session.add(new_registration)
            db.session.commit()
            return schemas.event_registration_schema.dump(new_registration)
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(EventRegistrations, '/events/<int:event_id>/registrations')

class EventRegistrationByID(Resource):
    def get(self, event_id, registration_id):
        registration = db.session.get(models.EventRegistration, registration_id)
        if not registration or registration.event_id != event_id:
            return {'error': 'Registration not found'}, 404
        return schemas.event_registration_schema.dump(registration), 200
    
    def delete(self, event_id, registration_id):
        try:
          registration = db.session.get(models.EventRegistration, registration_id)
          if not registration or registration.event_id != event_id:
              return {'error': 'Registration not found'}, 404
          db.session.delete(registration)
          db.session.commit()
          return {'message': 'Registration successfully deleted'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(EventRegistrationByID, '/events/<int:event_id>/registrations/<int:registration_id>') 

class Sermons(Resource):
    def get(self):
        _sync_facebook_sermons()
        sermons = models.Sermon.query.order_by(models.Sermon.date.desc()).all()
        return schemas.sermons_schema.dump(sermons)
    
    def post(self):
        try:
            data = request.get_json()
            new_sermon = schemas.sermon_schema.load(data)
            db.session.add(new_sermon)
            db.session.commit()
            return schemas.sermon_schema.dump(new_sermon), 201
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(Sermons, '/sermons')

class SermonByID(Resource):
    def get(self, sermon_id):
        sermon = db.session.get(models.Sermon, sermon_id)
        if not sermon:
            return {'error': 'Sermon not found'}, 200
        db.session.add(sermon)
        db.session.commit()
        return schemas.sermon_schema.dump(sermon)
    
    def patch(self, sermon_id):
        sermon = db.session.get(models.Sermon, sermon_id)
        if not sermon:
            return {'error': 'Sermon not found'}, 404
        
        try: 
            data = request.get_json()
            for key, value in data.items():
                if hasattr(sermon, key):
                    setattr(sermon, key, value)
            db.session.commit()
            return schemas.sermon_schema.dump(sermon), 200
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
    def delete(self, sermon_id):
        sermon = db.session.get(models.Sermon, sermon_id)
        if not sermon:
            return {'error': 'Sermon not found'}, 404
        
        try:
            db.session.delete(sermon)
            db.session.commit()
            return {'message': 'Sermon successfully deleted'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(SermonByID, '/sermons/<int:sermon_id>')


_youtube_video_cache = {'videos': [], 'fetched_at': None}
_youtube_search_cache = {}
YOUTUBE_CACHE_INTERVAL = timedelta(seconds=30)
EXCLUDED_YOUTUBE_TITLES = {'graceland bible church live stream'}


def _youtube_api_get(resource, params):
    query = urlencode({**params, 'key': YOUTUBE_API_KEY})
    request_url = f'https://www.googleapis.com/youtube/v3/{resource}?{query}'
    req = Request(request_url, headers={'User-Agent': 'GracelandChurchWebsite/1.0'})
    with urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))


def _get_latest_youtube_videos():
    now = datetime.now()
    fetched_at = _youtube_video_cache['fetched_at']
    if fetched_at and now - fetched_at < YOUTUBE_CACHE_INTERVAL:
        return _youtube_video_cache['videos']

    channel_data = _youtube_api_get('channels', {
        'part': 'contentDetails',
        'id': YOUTUBE_CHANNEL_ID,
    })
    channel_items = channel_data.get('items', [])
    if not channel_items:
        raise ValueError('YouTube channel was not found')

    uploads_playlist_id = (
        channel_items[0]
        .get('contentDetails', {})
        .get('relatedPlaylists', {})
        .get('uploads')
    )
    if not uploads_playlist_id:
        raise ValueError('YouTube uploads playlist was not found')

    playlist_data = _youtube_api_get('playlistItems', {
        'part': 'snippet,contentDetails',
        'playlistId': uploads_playlist_id,
        'maxResults': 10,
    })

    videos = []
    for item in playlist_data.get('items', []):
        snippet = item.get('snippet', {})
        video_id = item.get('contentDetails', {}).get('videoId')
        title = (snippet.get('title') or 'YouTube video').strip()
        if not video_id or title.lower() in EXCLUDED_YOUTUBE_TITLES:
            continue
        thumbnails = snippet.get('thumbnails', {})
        thumbnail = (
            thumbnails.get('maxres')
            or thumbnails.get('standard')
            or thumbnails.get('high')
            or thumbnails.get('medium')
            or thumbnails.get('default')
            or {}
        )
        videos.append({
            'id': video_id,
            'title': title,
            'thumbnail_url': thumbnail.get('url'),
            'published_at': snippet.get('publishedAt'),
            'embed_url': f'https://www.youtube-nocookie.com/embed/{video_id}',
        })
        if len(videos) == 9:
            break

    _youtube_video_cache['videos'] = videos
    _youtube_video_cache['fetched_at'] = now
    return videos


def _search_youtube_videos(query):
    normalized_query = query.strip().lower()
    cached = _youtube_search_cache.get(normalized_query)
    now = datetime.now()
    if cached and now - cached['fetched_at'] < YOUTUBE_CACHE_INTERVAL:
        return cached['videos']

    search_data = _youtube_api_get('search', {
        'part': 'snippet',
        'channelId': YOUTUBE_CHANNEL_ID,
        'q': query,
        'type': 'video',
        'order': 'date',
        'maxResults': 10,
    })

    videos = []
    for item in search_data.get('items', []):
        snippet = item.get('snippet', {})
        video_id = item.get('id', {}).get('videoId')
        title = (snippet.get('title') or 'YouTube video').strip()
        if not video_id or title.lower() in EXCLUDED_YOUTUBE_TITLES:
            continue
        thumbnails = snippet.get('thumbnails', {})
        thumbnail = (
            thumbnails.get('high')
            or thumbnails.get('medium')
            or thumbnails.get('default')
            or {}
        )
        videos.append({
            'id': video_id,
            'title': title,
            'thumbnail_url': thumbnail.get('url'),
            'published_at': snippet.get('publishedAt'),
            'embed_url': f'https://www.youtube-nocookie.com/embed/{video_id}',
        })
        if len(videos) == 9:
            break

    _youtube_search_cache[normalized_query] = {
        'videos': videos,
        'fetched_at': now,
    }
    return videos


class LatestYouTubeVideos(Resource):
    def get(self):
        if not YOUTUBE_API_KEY:
            return {'error': 'Latest videos are temporarily unavailable.'}, 503
        try:
            query = request.args.get('q', '').strip()
            videos = _search_youtube_videos(query) if query else _get_latest_youtube_videos()
            return {'videos': videos}, 200
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            app.logger.warning('Unable to load latest YouTube videos: %s', error)
            return {'error': 'Latest videos are temporarily unavailable.'}, 503


api.add_resource(LatestYouTubeVideos, '/youtube/videos')


_google_calendar_cache = {}
GOOGLE_CALENDAR_CACHE_INTERVAL = timedelta(minutes=15)


def _get_google_calendar_events(year, month):
    now = datetime.now()
    cache_key = f'{year:04d}-{month:02d}'
    cached = _google_calendar_cache.get(cache_key)
    if cached and now - cached['fetched_at'] < GOOGLE_CALENDAR_CACHE_INTERVAL:
        return cached['events']

    window_start = datetime(year, month, 1) - timedelta(days=7)
    if month == 12:
        next_month = datetime(year + 1, 1, 1)
    else:
        next_month = datetime(year, month + 1, 1)
    window_end = next_month + timedelta(days=7)

    params = urlencode({
        'key': GOOGLE_CALENDAR_API_KEY,
        'timeMin': window_start.isoformat() + 'Z',
        'timeMax': window_end.isoformat() + 'Z',
        'singleEvents': 'true',
        'orderBy': 'startTime',
        'showDeleted': 'false',
        'maxResults': 250,
    })
    calendar_id = quote(GOOGLE_CALENDAR_ID, safe='')
    request_url = (
        f'https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events?{params}'
    )
    req = Request(request_url, headers={'User-Agent': 'GracelandChurchWebsite/1.0'})
    with urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode('utf-8'))

    events = []
    for item in data.get('items', []):
        start = item.get('start', {})
        end = item.get('end', {})
        start_value = start.get('dateTime') or start.get('date')
        if not start_value:
            continue
        is_all_day = bool(start.get('date') and not start.get('dateTime'))
        start_datetime = f'{start_value}T00:00:00' if is_all_day else start_value
        end_value = end.get('dateTime') or end.get('date')
        end_datetime = (
            f'{end_value}T00:00:00'
            if is_all_day and end_value
            else end_value
        )
        events.append({
            'id': f"google-{item.get('id', start_value)}",
            'title': item.get('summary') or 'Calendar event',
            'description': item.get('description') or None,
            'start_datetime': start_datetime,
            'end_datetime': end_datetime,
            'location': item.get('location') or None,
            'html_link': item.get('htmlLink') or None,
            'isGoogleCalendar': True,
            'isReadOnly': True,
            'isAllDay': is_all_day,
        })

    _google_calendar_cache[cache_key] = {
        'events': events,
        'fetched_at': now,
    }
    return events


class GoogleCalendarEvents(Resource):
    def get(self):
        try:
            now = datetime.now()
            year = request.args.get('year', default=now.year, type=int)
            month = request.args.get('month', default=now.month, type=int)
            if not 1 <= month <= 12 or not 1970 <= year <= 2100:
                return {'error': 'Invalid calendar range.'}, 400
            sync_google_calendar()
            month_start = datetime(year, month, 1)
            month_end = datetime(year + (month == 12), 1 if month == 12 else month + 1, 1)
            events = models.Event.query.filter(
                models.Event.source == 'google_calendar',
                models.Event.start_datetime >= month_start,
                models.Event.start_datetime < month_end,
            ).order_by(models.Event.start_datetime.asc()).all()
            return {'events': schemas.events_schema.dump(events)}, 200
        except Exception as error:
            app.logger.warning('Unable to load stored Google Calendar events: %s', error)
            return {'error': 'Calendar events are temporarily unavailable.'}, 503


api.add_resource(GoogleCalendarEvents, '/google-calendar/events')


def _facebook_video_embed_url(permalink_url):
    """Build iframe-friendly Facebook video embed URL."""
    if not permalink_url or not permalink_url.startswith('http'):
        return None
    return (
        f'https://www.facebook.com/plugins/video.php?href={quote(permalink_url, safe="")}'
        f'&show_text=false&width=900&height=506'
    )


_last_facebook_sync = None
FACEBOOK_SYNC_INTERVAL = timedelta(minutes=10)


def _sync_facebook_sermons(force=False):
    """Fetch page videos from Facebook Graph API and upsert sermon records."""
    global _last_facebook_sync

    if not FACEBOOK_PAGE_ID or not FACEBOOK_PAGE_ACCESS_TOKEN:
        return {'skipped': True, 'reason': 'not_configured'}

    now = datetime.now()
    if not force and _last_facebook_sync and now - _last_facebook_sync < FACEBOOK_SYNC_INTERVAL:
        return {'skipped': True, 'reason': 'cached'}

    url = (
        f'https://graph.facebook.com/v18.0/{FACEBOOK_PAGE_ID}/videos'
        f'?fields=id,created_time,description,permalink_url,title,length'
        f'&access_token={FACEBOOK_PAGE_ACCESS_TOKEN}&limit=50'
    )
    try:
        req = Request(url, headers={'User-Agent': 'ChurchCMS/1.0'})
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except HTTPError as e:
        body = e.read().decode() if e.fp else ''
        return {'error': 'Facebook API error', 'detail': body or str(e)}
    except URLError as e:
        return {'error': 'Network error', 'detail': str(e.reason)}
    except (json.JSONDecodeError, KeyError) as e:
        return {'error': 'Invalid Facebook response', 'detail': str(e)}

    items = data.get('data') or []
    created = 0
    updated = 0
    for v in items:
        vid = v.get('id')
        permalink = (v.get('permalink_url') or '').strip()
        video_url = _facebook_video_embed_url(permalink) if permalink else None
        if not video_url:
            continue
        created_str = (v.get('created_time') or '')[:10]
        try:
            sermon_date = date.fromisoformat(created_str) if created_str else date.today()
        except ValueError:
            sermon_date = date.today()
        raw_title = (v.get('title') or v.get('description') or '').strip()
        title = (raw_title[:252] + '..') if len(raw_title) > 255 else (raw_title or f'Facebook Live - {sermon_date}')
        existing = models.Sermon.query.filter_by(source='facebook', external_id=vid).first()
        if existing:
            existing.title = title
            existing.date = sermon_date
            existing.video_url = video_url
            updated += 1
        else:
            db.session.add(models.Sermon(
                title=title,
                date=sermon_date,
                video_url=video_url,
                external_id=vid,
                source='facebook',
            ))
            created += 1

    try:
        db.session.commit()
        _last_facebook_sync = now
    except Exception as e:
        db.session.rollback()
        return {'error': 'Database error', 'detail': str(e)}

    return {'created': created, 'updated': updated, 'fetched': len(items)}


class SyncFacebookSermons(Resource):
    """Sync sermons from the church's Facebook Page videos (including past live videos)."""
    def post(self):
        if not FACEBOOK_PAGE_ID or not FACEBOOK_PAGE_ACCESS_TOKEN:
            return {
                'error': 'Facebook Page not configured',
                'message': 'Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in the server environment.'
            }, 503

        result = _sync_facebook_sermons(force=True)
        if result.get('error'):
            return {'error': result['error'], 'detail': result.get('detail')}, 502
        if result.get('skipped'):
            return {'message': 'Sync skipped', 'detail': result.get('reason')}, 200
        return {
            'message': 'Sync complete',
            'created': result.get('created', 0),
            'updated': result.get('updated', 0),
            'fetched': result.get('fetched', 0),
        }, 200


api.add_resource(SyncFacebookSermons, '/sermons/sync-facebook')

class Donation(Resource):
    def get(self):
        donations = models.Donation.query.all()
        return schemas.donations_schema.dump(donations)
    
    def post(self):
        try:
          data = request.get_json()
          new_donation = schemas.donation_schema.load(data)
          db.session.add(new_donation)
          db.session.commit()
          return schemas.donation_schema.dump(new_donation)
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(Donation, '/donations')

class DonationByID(Resource):
    def get(self, donation_id):
        donation = db.session.get(models.Donation, donation_id)
        if not donation:
            return {'error': 'Donation not found'}, 404
        
        db.session.add(donation)
        db.session.commit()
        return schemas.donation_schema.dump(donation)
    
    def patch(self, donation_id):
        donation = db.session.get(models.Donation, donation_id)
        if not donation:
            return {'error': 'Donation not found'}, 404
        
        try:
          data = request.get_json()
          for key, value in data.items():
              if hasattr(donation, key):
                  setattr(donation, key, value)
          db.session.commit()
          return schemas.donation_schema.dump(donation)
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
    def delete(self, donation_id):
        donation = db.session.get(models.Donation, donation_id)
        if not donation:
            return {'error': 'Donation not found'}, 404
        
        try:
          db.session.delete(donation)
          db.session.commit()
          return {'message': 'Donation successfully deleted'}, 200
        
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(DonationByID, '/donations/<int:donation_id>')


PRAYER_STATUSES = {
    'new', 'approved_public', 'private', 'answered', 'archived'
}


def _prayer_owner_token(prayer_request_id):
    secret = app.secret_key or app.config.get('SECRET_KEY')
    if not secret:
        raise RuntimeError('SECRET_KEY is required for prayer ownership tokens')
    secret_bytes = secret.encode('utf-8') if isinstance(secret, str) else secret
    message = f'prayer-owner:{prayer_request_id}'.encode('utf-8')
    return hmac.new(secret_bytes, message, hashlib.sha256).hexdigest()


def _can_manage_public_prayer(prayer_request):
    if user_is_admin(_get_current_user()):
        return True
    supplied_token = request.headers.get('X-Prayer-Owner-Token', '')
    if not supplied_token:
        return False
    return hmac.compare_digest(
        supplied_token,
        _prayer_owner_token(prayer_request.id),
    )


def _admin_prayer_data(prayer_request):
    return {
        'id': prayer_request.id,
        'name': prayer_request.name or 'Anonymous',
        'request_text': prayer_request.request_text,
        # is_public is visitor publication consent, not approval.
        'publication_consent': bool(prayer_request.is_public),
        'status': prayer_request.status,
        'date_submitted': (
            prayer_request.date_submitted.isoformat()
            if prayer_request.date_submitted else None
        ),
    }


class PrayerRequests(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return {'error': 'Invalid request data'}, 400

        name_value = data.get('name', '')
        request_value = data.get('request_text', '')
        if name_value is not None and not isinstance(name_value, str):
            return {'error': 'Name must be text'}, 400
        if not isinstance(request_value, str):
            return {'error': 'Prayer request must be text'}, 400

        name = (name_value or '').strip() or 'Anonymous'
        request_text = request_value.strip()
        publication_consent = data.get('publication_consent', False)

        if len(name) > 100:
            return {'error': 'Name must be 100 characters or fewer'}, 400
        if not request_text:
            return {'error': 'Prayer request is required'}, 400
        if len(request_text) > 2000:
            return {'error': 'Prayer request must be 2,000 characters or fewer'}, 400
        if not isinstance(publication_consent, bool):
            return {'error': 'Publication consent must be true or false'}, 400

        protection_error = _verify_public_submission(data, 'prayer')
        if protection_error:
            db.session.rollback()
            return protection_error

        prayer_request = models.PrayerRequest(
            user_id=None,
            name=name,
            request_text=request_text,
            is_public=publication_consent,
            status='new' if publication_consent else 'private',
        )

        try:
            db.session.add(prayer_request)
            db.session.flush()
            db.session.commit()
            return {
                'id': prayer_request.id,
                'owner_token': _prayer_owner_token(prayer_request.id),
                'status': prayer_request.status,
                'message': 'Prayer request submitted for staff review',
            }, 201
        except Exception:
            db.session.rollback()
            return {'error': 'Unable to submit prayer request'}, 500


api.add_resource(PrayerRequests, '/prayer-requests')


class PublicPrayerRequestByID(Resource):
    def _public_request(self, prayer_request_id):
        return models.PrayerRequest.query.filter_by(
            id=prayer_request_id,
            status='approved_public',
            is_public=True,
        ).first()

    def patch(self, prayer_request_id):
        prayer_request = self._public_request(prayer_request_id)
        if not prayer_request:
            return {'error': 'Public prayer request not found'}, 404
        if not _can_manage_public_prayer(prayer_request):
            return {'error': 'You cannot edit this prayer request'}, 403
        data = request.get_json(silent=True) or {}
        request_text = str(data.get('request_text', '') or '').strip()
        if not request_text:
            return {'error': 'Prayer request is required'}, 400
        if len(request_text) > 2000:
            return {'error': 'Prayer request must be 2,000 characters or fewer'}, 400
        prayer_request.request_text = request_text
        db.session.commit()
        return {'id': prayer_request.id, 'request_text': request_text}, 200

    def delete(self, prayer_request_id):
        prayer_request = self._public_request(prayer_request_id)
        if not prayer_request:
            return {'error': 'Public prayer request not found'}, 404
        if not _can_manage_public_prayer(prayer_request):
            return {'error': 'You cannot delete this prayer request'}, 403
        db.session.delete(prayer_request)
        db.session.commit()
        return {'message': 'Prayer request deleted'}, 200


api.add_resource(PublicPrayerRequestByID, '/prayer-requests/<int:prayer_request_id>')


class PrayerWall(Resource):
    def get(self):
        try:
            requests_for_wall = (
                models.PrayerRequest.query
                .filter(
                    models.PrayerRequest.status == 'approved_public',
                    models.PrayerRequest.is_public.is_(True),
                )
                .order_by(
                    models.PrayerRequest.date_submitted.desc(),
                    models.PrayerRequest.id.desc(),
                )
                .limit(20)
                .all()
            )
            return [
                {
                    'id': prayer_request.id,
                    'name': prayer_request.name or 'Anonymous',
                    'request_text': prayer_request.request_text,
                    'date': (
                        prayer_request.date_submitted.isoformat()
                        if prayer_request.date_submitted else None
                    ),
                }
                for prayer_request in requests_for_wall
            ], 200
        except Exception:
            return {'error': 'Unable to load prayer wall'}, 500


api.add_resource(PrayerWall, '/prayer-wall')


class AdminPrayerRequests(Resource):
    def get(self):
        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403

        try:
            prayer_requests = (
                models.PrayerRequest.query
                .order_by(
                    models.PrayerRequest.date_submitted.desc(),
                    models.PrayerRequest.id.desc(),
                )
                .all()
            )
            return [
                _admin_prayer_data(item) for item in prayer_requests
            ], 200
        except Exception:
            db.session.rollback()
            return {'error': 'Unable to load prayer requests'}, 500


api.add_resource(AdminPrayerRequests, '/admin/prayer-requests')


class AdminPrayerRequestByID(Resource):
    def patch(self, prayer_request_id):
        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403

        try:
            prayer_request = db.session.get(
                models.PrayerRequest, prayer_request_id
            )
            if not prayer_request:
                return {'error': 'Prayer request not found'}, 404

            data = request.get_json(silent=True) or {}
            status = str(data.get('status', '')).strip()
            if status not in PRAYER_STATUSES:
                return {'error': 'Invalid prayer request status'}, 400
            if status == 'approved_public' and not prayer_request.is_public:
                return {
                    'error': 'This request does not have publication consent'
                }, 400

            prayer_request.status = status
            db.session.commit()
            return _admin_prayer_data(prayer_request), 200
        except Exception:
            db.session.rollback()
            return {'error': 'Unable to update prayer request'}, 500

    def delete(self, prayer_request_id):
        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403

        try:
            prayer_request = db.session.get(
                models.PrayerRequest, prayer_request_id
            )
            if not prayer_request:
                return {'error': 'Prayer request not found'}, 404

            db.session.delete(prayer_request)
            db.session.commit()
            return {'message': 'Prayer request deleted'}, 200
        except Exception:
            db.session.rollback()
            return {'error': 'Unable to delete prayer request'}, 500


api.add_resource(
    AdminPrayerRequestByID,
    '/admin/prayer-requests/<int:prayer_request_id>',
)


MINISTRY_PAGE_SLUGS = {'children', 'youth', 'young-adult', 'men', 'women', 'marriage'}


class MinistryPageContentBySlug(Resource):
    def get(self, slug):
        if slug not in MINISTRY_PAGE_SLUGS:
            return {'error': 'Ministry page not found'}, 404

        page = models.MinistryPageContent.query.filter_by(slug=slug).first()
        if not page:
            return {'slug': slug, 'blocks': []}, 200

        return schemas.ministry_page_content_schema.dump(page), 200

    def put(self, slug):
        if slug not in MINISTRY_PAGE_SLUGS:
            return {'error': 'Ministry page not found'}, 404

        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403

        data = request.get_json(silent=True) or {}
        data['slug'] = slug

        page = models.MinistryPageContent.query.filter_by(slug=slug).first()
        try:
            if page:
                updated = schemas.ministry_page_content_schema.load(
                    data, instance=page, partial=True
                )
            else:
                updated = schemas.ministry_page_content_schema.load(data)
                db.session.add(updated)

            db.session.commit()
            return schemas.ministry_page_content_schema.dump(updated), 200
        except ValidationError as ve:
            db.session.rollback()
            return {'error': ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


api.add_resource(MinistryPageContentBySlug, '/ministry-pages/<string:slug>')


class MinistryPageUpload(Resource):
    def post(self, slug):
        if slug not in MINISTRY_PAGE_SLUGS:
            return {'error': 'Ministry page not found'}, 404

        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403

        file = request.files.get('file')
        if not file or not file.filename:
            return {'error': 'No file provided'}, 400

        if not ministry_upload_allowed(file.filename):
            return {'error': 'File type not allowed'}, 400

        try:
            stored_name = save_ministry_upload(app, slug, file)
            url = f"{request.host_url.rstrip('/')}/uploads/ministry/{slug}/{stored_name}"
            return {'url': url, 'filename': file.filename}, 201
        except Exception as e:
            return {'error': str(e)}, 500


api.add_resource(MinistryPageUpload, '/ministry-pages/<string:slug>/upload')


class SiteTextOverrides(Resource):
    def get(self):
        page_path = str(request.args.get('page_path', '')).strip()
        language = str(request.args.get('language', 'en')).strip()[:10]
        if not page_path or len(page_path) > 255:
            return {'error': 'A valid page_path is required'}, 400

        overrides = models.SiteTextOverride.query.filter_by(
            page_path=page_path,
            language=language,
        ).all()
        return {
            'overrides': {
                item.element_key: item.content
                for item in overrides
            }
        }, 200

    def put(self):
        user = _get_current_user()
        if not user:
            return {'error': 'Login required'}, 401

        data = request.get_json(silent=True) or {}
        page_path = str(data.get('page_path', '')).strip()
        element_key = str(data.get('element_key', '')).strip()
        language = str(data.get('language', 'en')).strip()[:10]
        content = data.get('content')

        if not page_path or len(page_path) > 255:
            return {'error': 'A valid page_path is required'}, 400
        if not element_key or len(element_key) > 1000:
            return {'error': 'A valid element_key is required'}, 400
        if not isinstance(content, str) or len(content) > 20000:
            return {'error': 'Content must be text with at most 20,000 characters'}, 400

        item = models.SiteTextOverride.query.filter_by(
            page_path=page_path,
            element_key=element_key,
            language=language,
        ).first()
        if item:
            item.content = content
            item.updated_by_id = user.id
        else:
            item = models.SiteTextOverride(
                page_path=page_path,
                element_key=element_key,
                language=language,
                content=content,
                updated_by_id=user.id,
            )
            db.session.add(item)

        try:
            db.session.commit()
            return {'element_key': element_key, 'content': item.content}, 200
        except Exception:
            db.session.rollback()
            return {'error': 'Unable to save site text'}, 500

    def delete(self):
        if not _get_current_user():
            return {'error': 'Login required'}, 401

        data = request.get_json(silent=True) or {}
        item = models.SiteTextOverride.query.filter_by(
            page_path=str(data.get('page_path', '')).strip(),
            element_key=str(data.get('element_key', '')).strip(),
            language=str(data.get('language', 'en')).strip()[:10],
        ).first()
        if item:
            db.session.delete(item)
            db.session.commit()
        return '', 204


api.add_resource(SiteTextOverrides, '/site-text-overrides')


class AnonymousFeedback(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        name = str(data.get('name', '')).strip() or 'Anonymous'
        subject = str(data.get('subject', '')).strip() or 'Feedback'
        message = str(data.get('message', '')).strip()

        if len(name) > 100:
            return {'error': 'Name must be 100 characters or fewer'}, 400
        if len(subject) > 255:
            return {'error': 'Subject must be 255 characters or fewer'}, 400
        if not message:
            return {'error': 'Feedback is required'}, 400
        if len(message) > 5000:
            return {'error': 'Feedback must be 5,000 characters or fewer'}, 400

        feedback = models.ContactMessage(
            name=name,
            email='info@gracelandbible.church',
            subject=subject,
            message=message,
        )

        try:
            db.session.add(feedback)
            db.session.commit()
            return {'message': 'Feedback submitted successfully'}, 201
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


api.add_resource(AnonymousFeedback, '/feedback')


class MemberAnnouncements(Resource):
    def get(self):
        now = datetime.utcnow()
        announcements = (
            models.Announcement.query
            .filter(
                models.Announcement.status == 'approved',
                or_(
                    models.Announcement.expire_date.is_(None),
                    models.Announcement.expire_date > now,
                ),
            )
            .order_by(
                models.Announcement.publish_date.desc(),
                models.Announcement.id.desc(),
            )
            .limit(20)
            .all()
        )
        return [{
            'id': item.id,
            'title': item.title if item.author_id else '',
            'content': item.content or '',
            'publish_date': item.publish_date.isoformat() if item.publish_date else None,
            'author_name': (
                f'{item.author.member.first_name} {item.author.member.last_name}'
                if item.author and item.author.member
                else item.author.username if item.author else item.title or 'Anonymous'
            ),
        } for item in announcements], 200

    def post(self):
        data = request.get_json(silent=True) or {}
        name = str(data.get('name', '') or '').strip()[:120] or 'Anonymous'
        content = str(data.get('content', '') or '').strip()
        if not content:
            return {'error': 'Announcement is required'}, 400
        if len(content) > 5000:
            return {'error': 'Announcement must be 5,000 characters or fewer'}, 400

        protection_error = _verify_public_submission(data, 'announcement')
        if protection_error:
            db.session.rollback()
            return protection_error

        announcement = models.Announcement(
            title=name,
            content=content,
            author_id=None,
            publish_date=datetime.utcnow(),
            status='pending',
        )
        try:
            db.session.add(announcement)
            db.session.flush()
            db.session.commit()
            return {
                'id': announcement.id,
                'title': '',
                'content': announcement.content,
                'publish_date': announcement.publish_date.isoformat(),
                'author_name': name,
                'owner_token': _announcement_owner_token(announcement.id),
                'status': announcement.status,
                'message': 'Announcement submitted for staff review',
            }, 201
        except Exception as error:
            db.session.rollback()
            return {'error': str(error)}, 500


def _announcement_owner_token(announcement_id):
    secret = app.secret_key or app.config.get('SECRET_KEY')
    if not secret:
        raise RuntimeError('SECRET_KEY is required for announcement ownership tokens')
    secret_bytes = secret.encode('utf-8') if isinstance(secret, str) else secret
    message = f'announcement-owner:{announcement_id}'.encode('utf-8')
    return hmac.new(secret_bytes, message, hashlib.sha256).hexdigest()


def _can_manage_public_announcement(announcement):
    if user_is_admin(_get_current_user()):
        return True
    supplied_token = request.headers.get('X-Announcement-Owner-Token', '')
    return bool(supplied_token) and hmac.compare_digest(
        supplied_token,
        _announcement_owner_token(announcement.id),
    )


class MemberAnnouncementByID(Resource):
    def _announcement(self, announcement_id):
        return models.Announcement.query.filter_by(
            id=announcement_id,
            author_id=None,
        ).first()

    def patch(self, announcement_id):
        announcement = self._announcement(announcement_id)
        if not announcement:
            return {'error': 'Public announcement not found'}, 404
        if not _can_manage_public_announcement(announcement):
            return {'error': 'You cannot edit this announcement'}, 403
        data = request.get_json(silent=True) or {}
        content = str(data.get('content', '') or '').strip()
        if not content:
            return {'error': 'Announcement is required'}, 400
        if len(content) > 5000:
            return {'error': 'Announcement must be 5,000 characters or fewer'}, 400
        announcement.content = content
        db.session.commit()
        return {'id': announcement.id, 'content': announcement.content}, 200

    def delete(self, announcement_id):
        announcement = self._announcement(announcement_id)
        if not announcement:
            return {'error': 'Public announcement not found'}, 404
        if not _can_manage_public_announcement(announcement):
            return {'error': 'You cannot delete this announcement'}, 403
        db.session.delete(announcement)
        db.session.commit()
        return {'message': 'Announcement deleted'}, 200


class HomeAnnouncement(Resource):
    def get(self):
        return _home_announcement_value(), 200

    def put(self):
        if not _require_admin_or_staff():
            return {'error': 'Admin or staff access required'}, 403
        try:
            announcement = _validate_home_announcement(request.get_json(silent=True))
        except ValueError as error:
            return {'error': str(error)}, 400

        setting = models.SiteSetting.query.filter_by(key=HOME_ANNOUNCEMENT_KEY).first()
        if not setting:
            setting = models.SiteSetting(
                key=HOME_ANNOUNCEMENT_KEY,
                description='Current home hero announcement',
            )
            db.session.add(setting)
        setting.value = json.dumps(announcement)
        db.session.commit()
        return announcement, 200


class HomeAnnouncementUpload(Resource):
    def post(self):
        if not _require_admin_or_staff():
            return {'error': 'Admin or staff access required'}, 403
        file = request.files.get('file')
        if not file or not file.filename or '.' not in file.filename:
            return {'error': 'Choose an image or video file'}, 400
        extension = file.filename.rsplit('.', 1)[1].lower()
        allowed = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'ogg', 'mov'}
        if extension not in allowed:
            return {'error': 'Only image and video files are allowed'}, 400

        media = models.AnnouncementMedia(
            filename=file.filename[:255],
            content_type=(file.mimetype or 'application/octet-stream')[:100],
            data=file.read(),
        )
        if not media.data:
            return {'error': 'The uploaded file is empty'}, 400
        db.session.add(media)
        db.session.commit()
        url = f"{request.host_url.rstrip('/')}/announcement-media/{media.id}"
        return {'url': url, 'filename': file.filename}, 201


def _admin_announcement_data(item):
    return {
        'id': item.id,
        'name': item.title or 'Anonymous',
        'content': item.content or '',
        'status': item.status,
        'submitted_at': item.publish_date.isoformat() if item.publish_date else None,
        'reviewed_at': item.reviewed_at.isoformat() if item.reviewed_at else None,
    }


class AdminMemberAnnouncements(Resource):
    def get(self):
        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403
        items = (
            models.Announcement.query
            .filter(models.Announcement.author_id.is_(None))
            .order_by(models.Announcement.publish_date.desc(), models.Announcement.id.desc())
            .limit(100)
            .all()
        )
        return [_admin_announcement_data(item) for item in items], 200


class AdminMemberAnnouncementByID(Resource):
    def patch(self, announcement_id):
        actor = _require_admin_or_staff()
        if not actor:
            return {'error': 'Staff access required'}, 403
        item = models.Announcement.query.filter_by(id=announcement_id, author_id=None).first()
        if not item:
            return {'error': 'Announcement not found'}, 404
        status = str((request.get_json(silent=True) or {}).get('status', '')).strip()
        if status not in {'pending', 'approved', 'rejected'}:
            return {'error': 'Invalid announcement status'}, 400
        item.status = status
        item.reviewed_at = datetime.utcnow() if status != 'pending' else None
        item.reviewed_by_id = actor.id if status != 'pending' else None
        db.session.commit()
        return _admin_announcement_data(item), 200

    def delete(self, announcement_id):
        if not _require_admin_or_staff():
            return {'error': 'Staff access required'}, 403
        item = models.Announcement.query.filter_by(id=announcement_id, author_id=None).first()
        if not item:
            return {'error': 'Announcement not found'}, 404
        db.session.delete(item)
        db.session.commit()
        return {'message': 'Announcement deleted'}, 200


api.add_resource(MemberAnnouncements, '/announcements')
api.add_resource(MemberAnnouncementByID, '/announcements/<int:announcement_id>')
api.add_resource(HomeAnnouncement, '/home-announcement')
api.add_resource(HomeAnnouncementUpload, '/home-announcement/upload')
api.add_resource(AdminMemberAnnouncements, '/admin/announcements')
api.add_resource(AdminMemberAnnouncementByID, '/admin/announcements/<int:announcement_id>')


@app.route('/announcement-media/<int:media_id>')
def serve_persistent_announcement_media(media_id):
    media = db.session.get(models.AnnouncementMedia, media_id)
    if not media:
        return {'error': 'Not found'}, 404
    return send_file(
        BytesIO(media.data),
        mimetype=media.content_type,
        download_name=media.filename,
        max_age=3600,
    )


@app.route('/uploads/announcements/<path:filename>')
def serve_announcement_upload(filename):
    directory = os.path.join(app.config['UPLOAD_FOLDER'], 'announcements')
    if not os.path.isdir(directory):
        return {'error': 'Not found'}, 404
    return send_from_directory(directory, filename)


@app.route('/uploads/ministry/<string:slug>/<path:filename>')
def serve_ministry_upload(slug, filename):
    if slug not in MINISTRY_PAGE_SLUGS:
        return {'error': 'Not found'}, 404

    directory = os.path.join(app.config['UPLOAD_FOLDER'], 'ministry', slug)
    if not os.path.isdir(directory):
        return {'error': 'Not found'}, 404

    return send_from_directory(directory, filename)


start_hourly_sync(app)


if __name__ == '__main__':
    app.run(port=5555, debug=True)
