from config import app, db, api
from flask import session, request
from flask_restful import Resource
from flask_migrate import Migrate
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
            
            new_user = schemas.user_create_schema.load(data)
            db.session.add(new_user)
            db.session.commit()
            session['user_id'] = new_user.id
            return schemas.user_schema.dump(new_user), 201
        
        except Exception as e:
            return {'error': f"An error occured during registration: {str(e)}"}, 500
        
        except ValidationError as ve:
            return {'error': str(ve)}, 400
        
api.add_resource(SignUp, '/sign_up')

if __name__ == '__main__':
    app.run(port=5555, debug=True)


