from config import app, db, api
from flask import session, request
from flask_restful import Resource
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError
from marshmallow.exceptions import ValidationError
import models  # Import models to register them with SQLAlchemy
import schemas

# Initialize Flask-Migrate
migrate = Migrate(app, db)

@app.route('/')
def index():
    return '<h1>Church Management System</h1>'

class CheckSession(Resource):
    def get(self):
        user_id = session.get('user_id')

        if not user_id:
          return {'error': 'Not authenticated'}, 401
        
        user = db.session.get(models.User, user_id)
        if not user:
            session.pop('user_id', None)
            return {'error': 'Not authenticated'}, 401
        
        user_data = schemas.UserSchema.dump(user)
        return user_data, 200
    
api.add_resource(CheckSession, '/check_session')

class Login(Resource):
    def post(self):
        try:
          data = request.get_json()
          if not data or not all(c in data for c in ['useranme', 'password']):
              return {'error': 'MIssing required fields'}, 400
          
          user = models.User.query.filter_by(username=data['username']).first()
          if not user or not user._password_hash:
              return {'message': 'Invalid credentials'}, 401
          
          if user.authenticate(data['password']):
              session['user_id'] = user.id
              session.permanent = True
              return models.user_schema.dump(user), 200
          return {'message': 'Invalid credentials'}, 401    

        except Exception as e:
            return {'error': str(e)}, 500
        
api.add_resource(Login, '/login')

class Logout(Resource):
    def delete(self):
        user_id = session.get('user_id')
        
        if not user_id:
            return {'error': 'Not authenticated'}, 401
        
        session.pop(user_id, None)
        return {'message': 'Logout successful'}, 200

api.add_resource(Logout, '/logout')

class SignUp(Resource):
    def post(self):
        try:
            data = request.get_json()

            if not data or all(c in data for c in ['username', 'email', 'password']):
                return {'error': 'Missing required fields'}, 401
            
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
        
api.add_resource(MemberByID, '/members/<int:member_id')

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

api.add_resource(MinistryLeaderByID, '/ministry/<int:ministry_id/leaders>/<int:leader_id>')          
                    
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
        events = models.Event.query.order_by(models.Event.start_datetime.desc()).all()
        return schemas.events_schema.dump(events), 200
            
    def post(self):
        try:
            data = request.get_json()
            new_event = schemas.event_schema.load(data)
            db.session.add(new_event)
            db.session.commit()
            return schemas.event_schema.dump(new_event), 200
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
            return {'error', ve.messages}, 400
        except Exception as e:
            db.session.rollback()
            return {'error', str(e)}, 500
        
    def delete(self, event_id):
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
        
api.add_resource(EventByID, '/events/<int:id>')

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
        
api.add_resource(EventRegistrations, '/events/<int:id>/registrations')

if __name__ == '__main__':
    app.run(port=5555, debug=True)


