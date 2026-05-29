from config import app, db, api, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN
from flask import session, request, send_from_directory
from flask_restful import Resource
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError
from marshmallow.exceptions import ValidationError
from datetime import datetime, date, timedelta
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import quote
import json
import os
import models  # Import models to register them with SQLAlchemy
import schemas
from auth_utils import user_is_admin
from ministry_upload import ministry_upload_allowed, save_ministry_upload

# Initialize Flask-Migrate
migrate = Migrate(app, db)

@app.route('/')
def index():
    return '<h1>Church Management System</h1>'


def _get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(models.User, user_id)


def _require_admin():
    user = _get_current_user()
    if not user or not user_is_admin(user):
        return None
    return user

class CheckSession(Resource):
    def get(self):
        user_id = session.get('user_id')

        if not user_id:
          return {'error': 'Not authenticated'}, 401
        
        user = db.session.get(models.User, user_id)
        if not user:
            session.pop('user_id', None)
            return {'error': 'Not authenticated'}, 401
        
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
              session['user_id'] = user.id
              session.permanent = True
              return schemas.user_schema.dump(user), 200
          return {'message': 'Invalid credentials'}, 401    

        except Exception as e:
            return {'error': str(e)}, 500
        
api.add_resource(Login, '/login')

class Logout(Resource):
    def delete(self):
        user_id = session.get('user_id')
        
        if not user_id:
            return {'error': 'Not authenticated'}, 401
        
        session.pop('user_id', None)
        return {'message': 'Logout successful'}, 200

api.add_resource(Logout, '/logout')

class SignUp(Resource):
    def post(self):
        try:
            data = request.get_json()

            if not data or not all(c in data for c in ['username', 'email', 'password']):
                return {'error': 'Missing required fields'}, 400
            
            if models.User.query.filter_by(username=data['username']).first():
                return {'error': 'Username already exists'}, 400
            
            if models.User.query.filter_by(email=data['email']).first():
                return {'error': 'Email already exists'}, 400
            
            new_user = models.User(username=data['username'], email=data['email'])
            new_user.set_password(data['password'])

            db.session.add(new_user)
            db.session.commit()

            session['user_id'] = new_user.id
            return schemas.user_schema.dump(new_user), 201
        
        except ValidationError as ve:
            db.session.rollback()
            return {'error': str(ve)}, 400
        
        except Exception as e:
            db.session.rollback()
            return {'error': f"An error occured during registration: {str(e)}"}, 500          
        
api.add_resource(SignUp, '/sign_up')

class Users(Resource):
    def get(self):
        users = models.User.query.all()
        return schemas.users_schema.dump(users), 200
    
    def post(self): 
        try:
            data = request.get_json()

            new_user = models.User(username=data['username'], email=data['email'])
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
        user = db.session.get(models.User, user_id)
        if not user:
            return {'error': 'User not found'}, 404
        return schemas.user_schema.dump(user), 200
    
    def patch(self, user_id):
        user = db.session.get(models.User, user_id)
        if not user:
            return {'error': 'User not found'}, 404
        
        try: 
            data = request.get_json()
            if not data:
                return {'error': 'No data provided'}, 400
            updated_user = schemas.user_schema.load(data, instance=user, partial=True)
            db.session.commit()

            return schemas.user_schema.dump(updated_user), 200
        
        except ValidationError as ve:
            return {'error': ve.messages}, 400
        
        except Exception as e:
            db.session.rollback()
            return {'error': f'Internal server error: {str(e)}'}, 500
        
    def delete(self, user_id):
        user = db.session.get(models.User, user_id)

        if not user:
            return {'error': 'User not found'}, 404
        
        try:
            db.session.delete(user)
            db.session.commit()
            return {'message': 'User deleted successfully'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500       

api.add_resource(UserByID, '/users/<int:user_id>')

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
        if not _require_admin():
            return {'error': 'Admin access required'}, 403

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
        if not _require_admin():
            return {'error': 'Admin access required'}, 403

        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        
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
        if not _require_admin():
            return {'error': 'Admin access required'}, 403

        event = db.session.get(models.Event, event_id)
        if not event:
            return {'error': 'Event not found'}, 404
        try:
          db.session.delete(event)
          db.session.commit()
          return {'message': 'Event successfully deleted'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
        
api.add_resource(EventByID, '/events/<int:event_id>')

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

        if not _require_admin():
            return {'error': 'Admin access required'}, 403

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

        if not _require_admin():
            return {'error': 'Admin access required'}, 403

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


@app.route('/uploads/ministry/<string:slug>/<path:filename>')
def serve_ministry_upload(slug, filename):
    if slug not in MINISTRY_PAGE_SLUGS:
        return {'error': 'Not found'}, 404

    directory = os.path.join(app.config['UPLOAD_FOLDER'], 'ministry', slug)
    if not os.path.isdir(directory):
        return {'error': 'Not found'}, 404

    return send_from_directory(directory, filename)


if __name__ == '__main__':
    app.run(port=5555, debug=True)


