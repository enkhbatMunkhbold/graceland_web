from marshmallow import validates, post_load, fields, ValidationError
from marshmallow_sqlalchemy import auto_field
from config import db, ma, bcrypt

class User(db.Model):
  __tablename__ = 'users'

  id = db.Column(db.Integer, primary_key=True)
  username = db.Column(db.String, unique=True, nullable=False)
  email = db.Column(db.String, unique=True, nullable=False)
  _password_hash = db.Column(db.String, nullable=False)

  def set_password(self, password):
    if len(password) < 8:
      raise ValidationError('Password must be at least 8 characters long')
    
    password_hash = bcrypt.generate_password_hash(password)
    self._password_hash = password_hash.decode('utf-8')

  def authenticate(self, password):
    return bcrypt.check_password_hash(self._password_hash, password)
  
  def __repr__(self):
    return f'<User {self.username} >'